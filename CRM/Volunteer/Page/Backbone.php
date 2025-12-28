<?php

class CRM_Volunteer_Page_Backbone extends CRM_Core_Page {
  function run() {
    // Load CiviCRM's Backbone and Marionette libraries
    // These are required for the volunteer Backbone app to function
    CRM_Core_Resources::singleton()
      ->addScriptFile('civicrm', 'bower_components/backbone/backbone.js', 100, 'html-header')
      ->addScriptFile('civicrm', 'bower_components/backbone.marionette/lib/backbone.marionette.js', 110, 'html-header')
      ->addStyleFile('civicrm', 'bower_components/backbone.marionette/lib/backbone.marionette.css', 110, 'html-header');

    // Add our template
    CRM_Core_Smarty::singleton()->assign('isModulePermissionSupported',
      CRM_Core_Config::singleton()->userPermissionClass->isModulePermissionSupported());

    parent::run();
  }
}
