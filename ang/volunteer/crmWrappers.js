(function(angular, $, _) {
  'use strict';

  /**
   * Angular service wrappers for CiviCRM global functions
   *
   * These services provide Angular-friendly wrappers around CRM.* global functions,
   * ensuring proper digest cycle integration and returning promises instead of
   * using jQuery event callbacks.
   */

  /**
   * crmAlert - Angular-friendly wrapper for CRM.alert
   *
   * Usage:
   *   crmAlert(text, title, type, options);
   *   crmAlert('Success!', 'Saved', 'success');
   */
  angular.module('volunteer').service('crmAlert', function($timeout) {
    return function(text, title, type, options) {
      // Wrap in $timeout to ensure Angular digest cycle runs
      $timeout(function() {
        CRM.alert(text, title, type, options);
      });
    };
  });

  /**
   * crmConfirm - Angular-friendly wrapper for CRM.confirm
   *
   * Returns a promise that resolves on 'yes' and rejects on 'no'
   *
   * Usage:
   *   crmConfirm({message: 'Are you sure?'})
   *     .then(function() { // user clicked yes })
   *     .catch(function() { // user clicked no });
   */
  angular.module('volunteer').service('crmConfirm', function($q, $timeout) {
    return function(options) {
      var deferred = $q.defer();

      CRM.confirm(options)
        .on('crmConfirm:yes', function() {
          $timeout(function() {
            deferred.resolve(true);
          });
        })
        .on('crmConfirm:no', function() {
          $timeout(function() {
            deferred.reject(false);
          });
        });

      return deferred.promise;
    };
  });

  /**
   * crmDialog - Angular-friendly wrapper for CRM dialog functions
   *
   * Provides promise-based API for CiviCRM dialogs with automatic data refresh
   */
  angular.module('volunteer').service('crmDialog', function($q, $timeout) {
    return {
      /**
       * Load a form in a dialog
       * Returns a promise that resolves when form is successfully submitted
       *
       * Usage:
       *   crmDialog.loadForm(url, settings)
       *     .then(function(data) { // form submitted successfully })
       *     .catch(function(error) { // form submission failed });
       */
      loadForm: function(url, settings) {
        var deferred = $q.defer();

        CRM.loadForm(url, settings)
          .on('crmFormSuccess', function(event, data) {
            $timeout(function() {
              deferred.resolve(data);
            });
          })
          .on('crmFormError', function(event, error) {
            $timeout(function() {
              deferred.reject(error);
            });
          })
          .on('dialogclose', function(event, ui) {
            // If dialog closes without success/error, reject with null
            // (only if promise hasn't been resolved/rejected already)
            $timeout(function() {
              deferred.reject(null);
            });
          });

        return deferred.promise;
      },

      /**
       * Load a page in a dialog
       * Returns a promise that resolves when dialog closes
       *
       * Usage:
       *   crmDialog.loadPage(url, settings)
       *     .then(function() { // dialog closed });
       */
      loadPage: function(url, settings) {
        var deferred = $q.defer();

        CRM.loadPage(url, settings)
          .on('dialogclose', function(event) {
            $timeout(function() {
              deferred.resolve(true);
            });
          });

        return deferred.promise;
      }
    };
  });

  /**
   * crmUrl - Angular-friendly wrapper for CRM.url
   *
   * This is a simple pass-through since CRM.url doesn't need digest integration,
   * but provides consistency with other crmX services
   *
   * Usage:
   *   var url = crmUrl('civicrm/volunteer/loghours', 'reset=1&action=add&vid=123');
   */
  angular.module('volunteer').service('crmUrl', function() {
    return function(path, query) {
      return CRM.url(path, query);
    };
  });

  /**
   * crmStatus - Angular-friendly wrapper for crmStatus
   *
   * Note: crmStatus is already an Angular service in crmUtil, so we just
   * create an alias for consistency with other wrappers
   */
  angular.module('volunteer').factory('crmStatusWrapper', function(crmStatus) {
    return crmStatus;
  });

})(angular, CRM.$, CRM._);
