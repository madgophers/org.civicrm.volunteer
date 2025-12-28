<?php
/**
 * Test script for CiviVolunteer Conflict Detection
 *
 * Run from CiviCRM directory:
 * php /path/to/test_conflict_detection.php
 */

// Bootstrap CiviCRM
require_once 'civicrm.config.php';
require_once 'CRM/Core/Config.php';
$config = CRM_Core_Config::singleton();

echo "=== CiviVolunteer Conflict Detection Test ===\n\n";

try {
  // Find or create a test contact
  $contact = civicrm_api3('Contact', 'get', array(
    'contact_type' => 'Individual',
    'options' => array('limit' => 1),
  ));

  if (empty($contact['values'])) {
    echo "❌ No contacts found. Please create a contact first.\n";
    exit(1);
  }

  $contact_id = array_keys($contact['values'])[0];
  echo "✓ Using contact ID: $contact_id\n";

  // Find or create a test project
  $project = civicrm_api3('VolunteerProject', 'get', array(
    'options' => array('limit' => 1),
  ));

  if (empty($project['values'])) {
    echo "Creating test project...\n";
    $project = civicrm_api3('VolunteerProject', 'create', array(
      'title' => 'Test Project - Conflict Detection',
      'is_active' => 1,
    ));
    $project_id = $project['id'];
  } else {
    $project_id = array_keys($project['values'])[0];
  }
  echo "✓ Using project ID: $project_id\n\n";

  // TEST 1: Create first opportunity
  echo "TEST 1: Creating first opportunity (9-11 AM)...\n";
  $need1 = civicrm_api3('VolunteerNeed', 'create', array(
    'project_id' => $project_id,
    'start_time' => date('Y-m-d') . ' 09:00:00',
    'duration' => 120, // 2 hours
    'quantity' => 5,
    'is_active' => 1,
  ));
  echo "✓ Created need ID: {$need1['id']}\n\n";

  // TEST 2: Assign volunteer to first opportunity
  echo "TEST 2: Assigning volunteer to first opportunity...\n";
  $assignment1 = civicrm_api3('VolunteerAssignment', 'create', array(
    'volunteer_need_id' => $need1['id'],
    'assignee_contact_id' => $contact_id,
  ));
  echo "✅ SUCCESS: Assignment created (ID: {$assignment1['id']})\n\n";

  // TEST 3: Create overlapping opportunity
  echo "TEST 3: Creating overlapping opportunity (10 AM-12 PM)...\n";
  $need2 = civicrm_api3('VolunteerNeed', 'create', array(
    'project_id' => $project_id,
    'start_time' => date('Y-m-d') . ' 10:00:00',
    'duration' => 120, // 2 hours
    'quantity' => 5,
    'is_active' => 1,
  ));
  echo "✓ Created need ID: {$need2['id']}\n\n";

  // TEST 4: Try to assign same volunteer (should FAIL)
  echo "TEST 4: Attempting to assign same volunteer to overlapping shift...\n";
  try {
    $assignment2 = civicrm_api3('VolunteerAssignment', 'create', array(
      'volunteer_need_id' => $need2['id'],
      'assignee_contact_id' => $contact_id,
    ));
    echo "❌ UNEXPECTED: Assignment succeeded when it should have failed!\n";
  } catch (CiviCRM_API3_Exception $e) {
    echo "✅ SUCCESS: Conflict detected as expected!\n";
    echo "   Error message: " . $e->getMessage() . "\n\n";
  }

  // TEST 5: Force override (should succeed)
  echo "TEST 5: Forcing assignment despite conflict...\n";
  $assignment3 = civicrm_api3('VolunteerAssignment', 'create', array(
    'volunteer_need_id' => $need2['id'],
    'assignee_contact_id' => $contact_id,
    'force' => TRUE,
  ));
  echo "✅ SUCCESS: Assignment forced despite conflict (ID: {$assignment3['id']})\n\n";

  // TEST 6: Create non-overlapping opportunity
  echo "TEST 6: Creating non-overlapping opportunity (2-4 PM)...\n";
  $need3 = civicrm_api3('VolunteerNeed', 'create', array(
    'project_id' => $project_id,
    'start_time' => date('Y-m-d') . ' 14:00:00',
    'duration' => 120, // 2 hours
    'quantity' => 5,
    'is_active' => 1,
  ));
  echo "✓ Created need ID: {$need3['id']}\n\n";

  // TEST 7: Assign to non-overlapping (should succeed)
  echo "TEST 7: Assigning volunteer to non-overlapping shift...\n";
  $assignment4 = civicrm_api3('VolunteerAssignment', 'create', array(
    'volunteer_need_id' => $need3['id'],
    'assignee_contact_id' => $contact_id,
  ));
  echo "✅ SUCCESS: Assignment created for non-overlapping shift (ID: {$assignment4['id']})\n\n";

  // CLEANUP
  echo "=== CLEANUP ===\n";
  echo "Cleaning up test data...\n";
  civicrm_api3('VolunteerAssignment', 'delete', array('id' => $assignment1['id']));
  civicrm_api3('VolunteerAssignment', 'delete', array('id' => $assignment3['id']));
  civicrm_api3('VolunteerAssignment', 'delete', array('id' => $assignment4['id']));
  civicrm_api3('VolunteerNeed', 'delete', array('id' => $need1['id']));
  civicrm_api3('VolunteerNeed', 'delete', array('id' => $need2['id']));
  civicrm_api3('VolunteerNeed', 'delete', array('id' => $need3['id']));
  echo "✓ Cleanup complete\n\n";

  echo "=== ALL TESTS PASSED ✅ ===\n";

} catch (Exception $e) {
  echo "\n❌ TEST FAILED\n";
  echo "Error: " . $e->getMessage() . "\n";
  echo "Trace:\n" . $e->getTraceAsString() . "\n";
  exit(1);
}
