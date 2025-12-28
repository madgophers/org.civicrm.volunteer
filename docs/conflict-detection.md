# Conflict Detection

CiviVolunteer now includes automatic conflict detection to prevent volunteers from being double-booked in overlapping shifts.

## Overview

When assigning a volunteer to an opportunity, the system automatically checks if the volunteer is already assigned to another opportunity that overlaps in time. If a conflict is detected, the assignment will be blocked and an error message will be displayed.

## How It Works

### Automatic Checking

Conflict detection happens automatically whenever you:

1. **Manually assign** a volunteer through the "Assign Volunteers" interface
2. **Create an assignment** via the API
3. **Self-service sign-up** when a volunteer registers themselves

### What Constitutes a Conflict

A conflict occurs when:

- The volunteer is already assigned to an opportunity
- The new opportunity's time range overlaps with the existing assignment
- Both opportunities have specific start times and durations (not flexible opportunities)

### Example

**Existing Assignment:**
- Volunteer: Jane Doe
- Opportunity: Gate Duty
- Time: December 1, 2024, 9:00 AM - 11:00 AM

**New Assignment (CONFLICT):**
- Volunteer: Jane Doe
- Opportunity: Registration Desk
- Time: December 1, 2024, 10:00 AM - 12:00 PM

❌ This will be **blocked** because the shifts overlap from 10:00 AM to 11:00 AM.

**New Assignment (NO CONFLICT):**
- Volunteer: Jane Doe
- Opportunity: Clean Up
- Time: December 1, 2024, 11:30 AM - 1:00 PM

✅ This will be **allowed** because there's no overlap (30-minute gap).

## Flexible Opportunities

Conflict detection is **skipped** for:

- **Flexible opportunities** (marked with `is_flexible = TRUE`)
- Opportunities without specific start times
- Opportunities marked as "Any" time

This is because flexible opportunities don't have fixed time constraints and volunteers can complete them whenever convenient.

## Forcing an Assignment (Override)

In some cases, you may want to assign a volunteer despite a conflict (e.g., they confirmed they can handle both shifts). Administrators can override conflict detection.

### Via API

```php
// This will override conflict checking
$result = civicrm_api3('VolunteerAssignment', 'create', array(
  'volunteer_need_id' => 123,
  'assignee_contact_id' => 456,
  'force' => TRUE,  // <-- Skip conflict checking
));
```

### Via UI

*(To be implemented in Phase 2)*

A checkbox will be added to the assignment interface allowing admins to force assignments despite conflicts.

## Error Messages

When a conflict is detected, you'll see a clear error message like:

> **Conflict Detected:** This volunteer is already assigned to "Gate Duty" (December 1, 2024 9:00 AM - 11:00 AM) which overlaps with this shift.

The error includes:
- Project title of the conflicting assignment
- Date and time of the conflict
- If multiple conflicts exist, it shows the count and first conflict

## For Developers

### Using the ConflictChecker Class

```php
// Check for conflicts programmatically
$conflict = CRM_Volunteer_BAO_ConflictChecker::checkConflict(
  $contact_id,      // Volunteer contact ID
  $need_id,         // Opportunity ID
  $assignment_id    // (Optional) Exclude this assignment when checking
);

if ($conflict['has_conflict']) {
  // Handle conflict
  echo $conflict['message'];
  print_r($conflict['conflicts']);  // Array of conflicting assignments
}
```

### Conflict Detection Logic

The system checks for time overlaps using this algorithm:

```
Two time ranges overlap if:
  start1 < end2 AND end1 > start2
```

Where:
- `start1`, `end1` = New opportunity time range
- `start2`, `end2` = Existing assignment time range

### Database Queries

The conflict checker:

1. Gets all existing assignments for the volunteer
2. For each assignment, retrieves the associated need details
3. Calculates time ranges (start_time + duration = end_time)
4. Checks for overlaps using the formula above
5. Returns details of any conflicts found

## Benefits

✅ **Prevents scheduling errors** - No more accidentally double-booking volunteers

✅ **Saves coordinator time** - System catches conflicts automatically

✅ **Better volunteer experience** - Volunteers won't show up to find they're scheduled in two places

✅ **Maintains data integrity** - Assignment records accurately reflect volunteer availability

## Technical Details

- **Performance:** Conflict checking adds minimal overhead (typically <100ms)
- **Backward Compatible:** Existing assignments are not affected
- **Timezone Aware:** Uses CiviCRM's timezone settings for comparisons
- **Scalability:** Efficiently handles volunteers with many assignments

## Future Enhancements

Planned for upcoming phases:

- Visual conflict indicators in the calendar view (Phase 2)
- Bulk conflict checking when importing assignments (Phase 4)
- Conflict resolution suggestions (e.g., show available volunteers) (Phase 4)
- Email notifications when conflicts are detected (Phase 6)

## See Also

- [Volunteer Assignments](./assignments.md)
- [Volunteer Opportunities](./opportunities.md)
- [API Documentation](./dev/api.md)
