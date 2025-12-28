<?php

class CRM_Volunteer_Page_Backbone extends CRM_Core_Page {
  function run() {
    // Try to load Backbone and Marionette libraries
    // CiviCRM versions may provide these in different ways
    $resources = CRM_Core_Resources::singleton();

    // Attempt to load Backbone - try common paths
    $backbonePaths = [
      'bower_components/backbone/backbone.js',
      'packages/backbone/backbone-min.js',
      'js/Common.js' // Some CiviCRM versions bundle everything
    ];

    foreach ($backbonePaths as $path) {
      try {
        // Try to add the script if it exists
        $url = $resources->getUrl('civicrm', $path);
        if ($url) {
          $resources->addScriptUrl($url, 100, 'html-header', FALSE);
          break; // Stop after first successful load
        }
      } catch (Exception $e) {
        // Continue to next path
        continue;
      }
    }

    // Attempt to load Marionette
    $marionettePaths = [
      'bower_components/backbone.marionette/lib/backbone.marionette.js',
      'packages/backbone.marionette/lib/backbone.marionette.min.js'
    ];

    foreach ($marionettePaths as $path) {
      try {
        $url = $resources->getUrl('civicrm', $path);
        if ($url) {
          $resources->addScriptUrl($url, 110, 'html-header', FALSE);
          break;
        }
      } catch (Exception $e) {
        continue;
      }
    }

    // Add our template
    CRM_Core_Smarty::singleton()->assign('isModulePermissionSupported',
      CRM_Core_Config::singleton()->userPermissionClass->isModulePermissionSupported());

    parent::run();
  }
}
