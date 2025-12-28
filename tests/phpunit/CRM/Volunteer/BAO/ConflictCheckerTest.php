<?php
/*
 +--------------------------------------------------------------------+
 | CiviCRM version 4.4                                                |
 +--------------------------------------------------------------------+
 | Copyright CiviCRM LLC (c) 2004-2013                                |
 +--------------------------------------------------------------------+
 */

require_once dirname(dirname(dirname(dirname(__FILE__)))) . '/VolunteerTestAbstract.php';

/**
 * Test class for CRM_Volunteer_BAO_ConflictChecker
 *
 * @package CiviVolunteer
 * @group headless
 */
class CRM_Volunteer_BAO_ConflictCheckerTest extends VolunteerTestAbstract {

  protected $project_id;
  protected $contact_id;

  public function setUp(): void {
    parent::setUp();

    // Create test project
    $project = civicrm_api3('VolunteerProject', 'create', array(
      'title' => 'Test Project for Conflict Detection',
      'is_active' => 1,
    ));
    $this->project_id = $project['id'];

    // Create test contact
    $contact = civicrm_api3('Contact', 'create', array(
      'contact_type' => 'Individual',
      'first_name' => 'Test',
      'last_name' => 'Volunteer',
    ));
    $this->contact_id = $contact['id'];
  }

  /**
   * Test that no conflict is detected for first assignment
   */
  public function testNoConflictForFirstAssignment() {
    // Create a need
    $need = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'start_time' => '2024-12-30 09:00:00',
      'duration' => 120,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Check for conflicts (should be none)
    $result = CRM_Volunteer_BAO_ConflictChecker::checkConflict(
      $this->contact_id,
      $need['id']
    );

    $this->assertFalse($result['has_conflict'], 'Should not have conflict for first assignment');
    $this->assertEmpty($result['conflicts'], 'Conflicts array should be empty');
    $this->assertEquals('', $result['message'], 'Message should be empty');
  }

  /**
   * Test that conflict is detected for overlapping assignments
   */
  public function testConflictDetectedForOverlappingAssignments() {
    // Create first need (9-11 AM)
    $need1 = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'start_time' => '2024-12-30 09:00:00',
      'duration' => 120,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Assign volunteer to first need
    $assignment1 = civicrm_api3('VolunteerAssignment', 'create', array(
      'volunteer_need_id' => $need1['id'],
      'assignee_contact_id' => $this->contact_id,
    ));

    // Create overlapping need (10 AM-12 PM)
    $need2 = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'start_time' => '2024-12-30 10:00:00',
      'duration' => 120,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Check for conflicts (should detect one)
    $result = CRM_Volunteer_BAO_ConflictChecker::checkConflict(
      $this->contact_id,
      $need2['id']
    );

    $this->assertTrue($result['has_conflict'], 'Should detect conflict for overlapping assignment');
    $this->assertCount(1, $result['conflicts'], 'Should have exactly one conflict');
    $this->assertNotEmpty($result['message'], 'Should have conflict message');

    // Verify conflict details
    $conflict = $result['conflicts'][0];
    $this->assertEquals($assignment1['id'], $conflict['assignment_id'], 'Conflict should reference first assignment');
    $this->assertEquals($need1['id'], $conflict['need_id'], 'Conflict should reference first need');
  }

  /**
   * Test that no conflict is detected for non-overlapping assignments
   */
  public function testNoConflictForNonOverlappingAssignments() {
    // Create first need (9-11 AM)
    $need1 = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'start_time' => '2024-12-30 09:00:00',
      'duration' => 120,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Assign volunteer to first need
    civicrm_api3('VolunteerAssignment', 'create', array(
      'volunteer_need_id' => $need1['id'],
      'assignee_contact_id' => $this->contact_id,
    ));

    // Create non-overlapping need (2-4 PM)
    $need2 = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'start_time' => '2024-12-30 14:00:00',
      'duration' => 120,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Check for conflicts (should be none)
    $result = CRM_Volunteer_BAO_ConflictChecker::checkConflict(
      $this->contact_id,
      $need2['id']
    );

    $this->assertFalse($result['has_conflict'], 'Should not have conflict for non-overlapping assignment');
    $this->assertEmpty($result['conflicts'], 'Conflicts array should be empty');
  }

  /**
   * Test that flexible needs skip conflict checking
   */
  public function testFlexibleNeedsSkipConflictChecking() {
    // Create flexible need
    $need = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'is_flexible' => 1,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Check for conflicts (should skip checking)
    $result = CRM_Volunteer_BAO_ConflictChecker::checkConflict(
      $this->contact_id,
      $need['id']
    );

    $this->assertFalse($result['has_conflict'], 'Flexible needs should not trigger conflict detection');
  }

  /**
   * Test force parameter allows override
   */
  public function testForceParameterAllowsOverride() {
    // Create first need
    $need1 = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'start_time' => '2024-12-30 09:00:00',
      'duration' => 120,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Assign volunteer
    civicrm_api3('VolunteerAssignment', 'create', array(
      'volunteer_need_id' => $need1['id'],
      'assignee_contact_id' => $this->contact_id,
    ));

    // Create overlapping need
    $need2 = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'start_time' => '2024-12-30 10:00:00',
      'duration' => 120,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Force assignment despite conflict (should succeed)
    $assignment2 = civicrm_api3('VolunteerAssignment', 'create', array(
      'volunteer_need_id' => $need2['id'],
      'assignee_contact_id' => $this->contact_id,
      'force' => TRUE,
    ));

    $this->assertNotEmpty($assignment2['id'], 'Force parameter should allow conflicting assignment');
  }

  /**
   * Test that API returns proper error for conflicts
   */
  public function testAPIReturnsProperErrorForConflicts() {
    // Create first need
    $need1 = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'start_time' => '2024-12-30 09:00:00',
      'duration' => 120,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Assign volunteer
    civicrm_api3('VolunteerAssignment', 'create', array(
      'volunteer_need_id' => $need1['id'],
      'assignee_contact_id' => $this->contact_id,
    ));

    // Create overlapping need
    $need2 = civicrm_api3('VolunteerNeed', 'create', array(
      'project_id' => $this->project_id,
      'start_time' => '2024-12-30 10:00:00',
      'duration' => 120,
      'quantity' => 5,
      'is_active' => 1,
    ));

    // Attempt conflicting assignment (should fail)
    $result = civicrm_api3('VolunteerAssignment', 'create', array(
      'volunteer_need_id' => $need2['id'],
      'assignee_contact_id' => $this->contact_id,
    ));

    $this->assertEquals(0, $result['is_error'], 'API should return error status');
    $this->assertArrayHasKey('error_code', $result, 'Should include error code');
    $this->assertEquals('volunteer_assignment_conflict', $result['error_code'], 'Should have conflict error code');
  }
}
