<?php
/**
 * CiviVolunteer Conflict Detection - Compatibility Check
 *
 * Run this script BEFORE installing the modified CiviVolunteer extension
 * to verify your CiviCRM installation is compatible.
 *
 * Usage: php check_compatibility.php
 */

echo "=== CiviVolunteer Conflict Detection - Compatibility Check ===\n\n";

$errors = array();
$warnings = array();
$checks_passed = 0;

// CHECK 1: PHP Version
echo "CHECK 1: PHP Version... ";
$php_version = phpversion();
if (version_compare($php_version, '7.4', '>=')) {
  echo "✅ PASS (PHP $php_version)\n";
  $checks_passed++;
} else {
  echo "❌ FAIL (PHP $php_version - Need 7.4+)\n";
  $errors[] = "PHP version must be 7.4 or higher";
}

// CHECK 2: CiviCRM Bootstrap
echo "CHECK 2: CiviCRM Available... ";
if (file_exists('civicrm.config.php')) {
  require_once 'civicrm.config.php';
  require_once 'CRM/Core/Config.php';
  try {
    $config = CRM_Core_Config::singleton();
    echo "✅ PASS\n";
    $checks_passed++;
  } catch (Exception $e) {
    echo "❌ FAIL (Cannot initialize CiviCRM)\n";
    $errors[] = "CiviCRM initialization failed: " . $e->getMessage();
  }
} else {
  echo "❌ FAIL (civicrm.config.php not found)\n";
  $errors[] = "Run this script from CiviCRM root directory";
}

if (!empty($errors)) {
  echo "\n❌ Cannot continue compatibility check without CiviCRM\n";
  foreach ($errors as $error) {
    echo "   - $error\n";
  }
  exit(1);
}

// CHECK 3: CiviCRM Version
echo "CHECK 3: CiviCRM Version... ";
$civi_version = CRM_Utils_System::version();
if (version_compare($civi_version, '5.71', '>=')) {
  echo "✅ PASS (CiviCRM $civi_version)\n";
  $checks_passed++;
} else {
  echo "⚠️  WARNING (CiviCRM $civi_version - Recommended 5.71+)\n";
  $warnings[] = "CiviCRM 5.71+ is recommended, you have $civi_version";
}

// CHECK 4: Required CiviCRM Classes
echo "CHECK 4: Required CiviCRM Classes... ";
$required_classes = array(
  'CRM_Core_Config',
  'CRM_Utils_Type',
  'CRM_Utils_Date',
  'CRM_Core_PseudoConstant',
  'CRM_Activity_BAO_Activity',
  'CRM_Core_DAO',
);
$missing_classes = array();
foreach ($required_classes as $class) {
  if (!class_exists($class)) {
    $missing_classes[] = $class;
  }
}
if (empty($missing_classes)) {
  echo "✅ PASS (" . count($required_classes) . " classes found)\n";
  $checks_passed++;
} else {
  echo "❌ FAIL\n";
  $errors[] = "Missing required classes: " . implode(', ', $missing_classes);
}

// CHECK 5: API v3 Available
echo "CHECK 5: CiviCRM API v3... ";
if (function_exists('civicrm_api3')) {
  try {
    $result = civicrm_api3('System', 'get');
    echo "✅ PASS\n";
    $checks_passed++;
  } catch (Exception $e) {
    echo "❌ FAIL (API v3 not working)\n";
    $errors[] = "API v3 test failed: " . $e->getMessage();
  }
} else {
  echo "❌ FAIL (civicrm_api3 function not found)\n";
  $errors[] = "CiviCRM API v3 is required";
}

// CHECK 6: Database Tables
echo "CHECK 6: CiviVolunteer Database Tables... ";
try {
  $tables_exist = true;
  $required_tables = array(
    'civicrm_volunteer_project',
    'civicrm_volunteer_need',
    'civicrm_activity',
    'civicrm_contact',
  );

  foreach ($required_tables as $table) {
    $dao = CRM_Core_DAO::executeQuery("SHOW TABLES LIKE '$table'");
    if (!$dao->fetch()) {
      $tables_exist = false;
      break;
    }
  }

  if ($tables_exist) {
    echo "✅ PASS (Tables exist)\n";
    $checks_passed++;
  } else {
    echo "⚠️  WARNING (CiviVolunteer not installed yet)\n";
    $warnings[] = "CiviVolunteer tables not found - extension must be installed first";
  }
} catch (Exception $e) {
  echo "⚠️  WARNING (Cannot check tables)\n";
  $warnings[] = "Database check failed: " . $e->getMessage();
}

// CHECK 7: Write Permissions
echo "CHECK 7: Extension Directory Writable... ";
$ext_dir = $config->extensionsDir;
if (is_writable($ext_dir)) {
  echo "✅ PASS ($ext_dir)\n";
  $checks_passed++;
} else {
  echo "❌ FAIL ($ext_dir is not writable)\n";
  $errors[] = "Extensions directory is not writable: $ext_dir";
}

// CHECK 8: Required Extension (angularprofiles)
echo "CHECK 8: Required Extensions... ";
try {
  $result = civicrm_api3('Extension', 'get', array(
    'full_name' => 'org.civicrm.angularprofiles',
    'status' => 'installed',
  ));

  if ($result['count'] > 0) {
    echo "✅ PASS (angularprofiles installed)\n";
    $checks_passed++;
  } else {
    echo "⚠️  WARNING (angularprofiles not installed)\n";
    $warnings[] = "org.civicrm.angularprofiles extension is required";
  }
} catch (Exception $e) {
  echo "⚠️  WARNING (Cannot check extensions)\n";
  $warnings[] = "Extension check failed: " . $e->getMessage();
}

// SUMMARY
echo "\n=== COMPATIBILITY CHECK SUMMARY ===\n\n";
echo "Checks Passed: $checks_passed/8\n";

if (!empty($errors)) {
  echo "\n❌ ERRORS (" . count($errors) . "):\n";
  foreach ($errors as $i => $error) {
    echo "   " . ($i + 1) . ". $error\n";
  }
}

if (!empty($warnings)) {
  echo "\n⚠️  WARNINGS (" . count($warnings) . "):\n";
  foreach ($warnings as $i => $warning) {
    echo "   " . ($i + 1) . ". $warning\n";
  }
}

if (empty($errors)) {
  echo "\n✅ COMPATIBILITY CHECK PASSED!\n";
  echo "\nYour CiviCRM installation is compatible with the modified CiviVolunteer extension.\n";
  echo "You can safely install the extension with conflict detection features.\n\n";
  echo "Next Steps:\n";
  echo "1. Copy the extension to: $ext_dir\n";
  echo "2. Install via: Administer > System Settings > Extensions\n";
  echo "3. Test conflict detection using the test scripts\n";
  exit(0);
} else {
  echo "\n❌ COMPATIBILITY CHECK FAILED!\n";
  echo "\nPlease fix the errors above before installing the extension.\n";
  exit(1);
}
