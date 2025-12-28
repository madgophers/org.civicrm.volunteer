<?php
/*
 +--------------------------------------------------------------------+
 | CiviCRM version 4.4                                                |
 +--------------------------------------------------------------------+
 | Copyright CiviCRM LLC (c) 2004-2013                                |
 +--------------------------------------------------------------------+
 | This file is a part of CiviCRM.                                    |
 |                                                                    |
 | CiviCRM is free software; you can copy, modify, and distribute it  |
 | under the terms of the GNU Affero General Public License           |
 | Version 3, 19 November 2007 and the CiviCRM Licensing Exception.   |
 |                                                                    |
 | CiviCRM is distributed in the hope that it will be useful, but     |
 | WITHOUT ANY WARRANTY; without even the implied warranty of         |
 | MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.               |
 | See the GNU Affero General Public License for more details.        |
 |                                                                    |
 | You should have received a copy of the GNU Affero General Public   |
 | License and the CiviCRM Licensing Exception along                  |
 | with this program; if not, contact CiviCRM LLC                     |
 | at info[AT]civicrm[DOT]org. If you have questions about the        |
 | GNU Affero General Public License or the licensing of CiviCRM,     |
 | see the CiviCRM license FAQ at http://civicrm.org/licensing        |
 +--------------------------------------------------------------------+
*/

/**
 * ConflictChecker - Prevents double-booking of volunteers
 *
 * Checks if a volunteer is already assigned to an opportunity that
 * overlaps in time with a new opportunity they're being assigned to.
 *
 * @package CRM
 * @copyright CiviCRM LLC (c) 2004-2013
 */

class CRM_Volunteer_BAO_ConflictChecker {

  /**
   * Check if assigning a volunteer to a need would create a time conflict.
   *
   * A conflict occurs when the volunteer is already assigned to another
   * opportunity whose time range overlaps with the new opportunity.
   *
   * @param int $contact_id
   *   The volunteer's contact ID
   * @param int $need_id
   *   The need (opportunity) ID to check
   * @param int|null $exclude_assignment_id
   *   Optional assignment ID to exclude from conflict checking
   *   (useful when updating an existing assignment)
   *
   * @return array
   *   Returns array with keys:
   *   - 'has_conflict' (bool): TRUE if conflict exists, FALSE otherwise
   *   - 'conflicts' (array): Array of conflicting assignments with details
   *   - 'message' (string): Human-readable conflict message
   */
  public static function checkConflict($contact_id, $need_id, $exclude_assignment_id = NULL) {
    $result = array(
      'has_conflict' => FALSE,
      'conflicts' => array(),
      'message' => '',
    );

    // Validate inputs
    if (!CRM_Utils_Type::validate($contact_id, 'Positive', FALSE)) {
      return $result;
    }
    if (!CRM_Utils_Type::validate($need_id, 'Positive', FALSE)) {
      return $result;
    }

    // Get the need details to determine time range
    try {
      $need = civicrm_api3('VolunteerNeed', 'getsingle', array(
        'id' => $need_id,
      ));
    } catch (CiviCRM_API3_Exception $e) {
      // Need doesn't exist, no conflict possible
      return $result;
    }

    // Skip conflict checking for flexible needs (they don't have specific times)
    if (!empty($need['is_flexible'])) {
      return $result;
    }

    // Calculate the time range for this need
    $start_time = !empty($need['start_time']) ? $need['start_time'] : NULL;
    if (!$start_time || !strtotime($start_time)) {
      // No valid start time, can't check for conflicts
      return $result;
    }

    // Calculate end time from start_time + duration
    $duration = !empty($need['duration']) ? (int) $need['duration'] : 0;
    if ($duration > 0) {
      $end_time = date('Y-m-d H:i:s', strtotime($start_time) + ($duration * 60));
    } else {
      // No duration, use end_time field if available
      $end_time = !empty($need['end_time']) ? $need['end_time'] : NULL;
      if (!$end_time || !strtotime($end_time)) {
        // No valid end time, can't accurately check for conflicts
        return $result;
      }
    }

    // Get all existing assignments for this volunteer
    try {
      $assignments = civicrm_api3('VolunteerAssignment', 'get', array(
        'assignee_contact_id' => $contact_id,
        'options' => array('limit' => 0), // Get all assignments
      ));
    } catch (CiviCRM_API3_Exception $e) {
      // Error getting assignments, assume no conflict
      return $result;
    }

    if (empty($assignments['values'])) {
      return $result;
    }

    // Check each assignment for time overlap
    foreach ($assignments['values'] as $assignment) {
      // Skip the assignment we're updating (if provided)
      if ($exclude_assignment_id && $assignment['id'] == $exclude_assignment_id) {
        continue;
      }

      // Get the need details for this assignment
      $assigned_need_id = $assignment['volunteer_need_id'] ?? NULL;
      if (!$assigned_need_id) {
        continue;
      }

      try {
        $assigned_need = civicrm_api3('VolunteerNeed', 'getsingle', array(
          'id' => $assigned_need_id,
        ));
      } catch (CiviCRM_API3_Exception $e) {
        continue;
      }

      // Skip flexible needs (no specific time)
      if (!empty($assigned_need['is_flexible'])) {
        continue;
      }

      // Get start and end time of existing assignment
      $assigned_start = !empty($assigned_need['start_time']) ? $assigned_need['start_time'] : NULL;
      if (!$assigned_start || !strtotime($assigned_start)) {
        continue;
      }

      // Calculate assigned end time
      $assigned_duration = !empty($assigned_need['duration']) ? (int) $assigned_need['duration'] : 0;
      if ($assigned_duration > 0) {
        $assigned_end = date('Y-m-d H:i:s', strtotime($assigned_start) + ($assigned_duration * 60));
      } else {
        $assigned_end = !empty($assigned_need['end_time']) ? $assigned_need['end_time'] : NULL;
        if (!$assigned_end || !strtotime($assigned_end)) {
          continue;
        }
      }

      // Check for time overlap
      // Two time ranges overlap if: start1 < end2 AND end1 > start2
      $start1 = strtotime($start_time);
      $end1 = strtotime($end_time);
      $start2 = strtotime($assigned_start);
      $end2 = strtotime($assigned_end);

      if ($start1 < $end2 && $end1 > $start2) {
        // Conflict detected!
        $result['has_conflict'] = TRUE;

        // Get project details for better error message
        $project_title = '';
        if (!empty($assigned_need['project_id'])) {
          try {
            $project = civicrm_api3('VolunteerProject', 'getsingle', array(
              'id' => $assigned_need['project_id'],
            ));
            $project_title = $project['title'] ?? '';
          } catch (CiviCRM_API3_Exception $e) {
            // Ignore error
          }
        }

        // Get role label
        $role_label = '';
        if (!empty($assigned_need['role_id'])) {
          $role_label = CRM_Core_PseudoConstant::getLabel(
            'CRM_Volunteer_DAO_Need',
            'role_id',
            $assigned_need['role_id']
          );
        }

        // Format times for display
        $config = CRM_Core_Config::singleton();
        $timeFormat = $config->dateformatDatetime;
        $assigned_time_display = CRM_Utils_Date::customFormat($assigned_start, $timeFormat);
        if ($assigned_end) {
          $assigned_time_display .= ' - ' . CRM_Utils_Date::customFormat($assigned_end, $timeFormat);
        }

        $result['conflicts'][] = array(
          'assignment_id' => $assignment['id'],
          'need_id' => $assigned_need_id,
          'project_id' => $assigned_need['project_id'] ?? NULL,
          'project_title' => $project_title,
          'role' => $role_label,
          'start_time' => $assigned_start,
          'end_time' => $assigned_end,
          'time_display' => $assigned_time_display,
        );
      }
    }

    // Build human-readable conflict message
    if ($result['has_conflict']) {
      $conflict_count = count($result['conflicts']);
      $first_conflict = $result['conflicts'][0];

      if ($conflict_count == 1) {
        $result['message'] = ts(
          'This volunteer is already assigned to "%1" (%2) which overlaps with this shift.',
          array(
            1 => $first_conflict['project_title'],
            2 => $first_conflict['time_display'],
            'domain' => 'org.civicrm.volunteer',
          )
        );
      } else {
        $result['message'] = ts(
          'This volunteer has %1 conflicting assignments. First conflict: "%2" (%3)',
          array(
            1 => $conflict_count,
            2 => $first_conflict['project_title'],
            3 => $first_conflict['time_display'],
            'domain' => 'org.civicrm.volunteer',
          )
        );
      }
    }

    return $result;
  }

  /**
   * Convenience method to check conflict and throw exception if found.
   *
   * @param int $contact_id
   *   The volunteer's contact ID
   * @param int $need_id
   *   The need (opportunity) ID to check
   * @param int|null $exclude_assignment_id
   *   Optional assignment ID to exclude from conflict checking
   * @param bool $force
   *   If TRUE, skip conflict checking (allow override)
   *
   * @throws CiviCRM_API3_Exception if conflict is detected
   * @return void
   */
  public static function checkConflictOrFail($contact_id, $need_id, $exclude_assignment_id = NULL, $force = FALSE) {
    // Allow admins to force assignment despite conflicts
    if ($force) {
      return;
    }

    $conflict = self::checkConflict($contact_id, $need_id, $exclude_assignment_id);

    if ($conflict['has_conflict']) {
      throw new CiviCRM_API3_Exception(
        $conflict['message'],
        'volunteer_assignment_conflict',
        $conflict
      );
    }
  }
}
