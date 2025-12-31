(function(angular, $, _) {

  angular.module('volunteer').config(function($routeProvider) {
    $routeProvider.when('/volunteer/project/:projectId/needs', {
      controller: 'VolunteerNeeds',
      templateUrl: '~/volunteer/Needs.html',
      resolve: {
        project: function(crmApi, $route) {
          var projectId = $route.current.params.projectId;
          if (projectId == 0) {
            return {id: 0};
          }
          return crmApi('VolunteerProject', 'getsingle', {
            id: projectId
          });
        },
        needs: function(crmApi, $route) {
          return crmApi('VolunteerNeed', 'get', {
            project_id: $route.current.params.projectId,
            'api.volunteer_assignment.getcount': {},
            options: {limit: 0, sort: 'start_time ASC'}
          }).then(function(result) {
            return result.values;
          });
        },
        roles: function(crmApi) {
          return crmApi('VolunteerUtil', 'getsupportingdata', {
            controller: 'VolOppsCtrl'
          }).then(function(result) {
            return result.values.roles;
          });
        },
        visibilityOptions: function() {
          // Visibility constants from CiviCRM
          return CRM.pseudoConstant.volunteer_need_visibility || {
            public: '1',
            admin: '2'
          };
        }
      }
    });
  });

  angular.module('volunteer').controller('VolunteerNeeds',
    function($scope, $location, $route, $q, $timeout, crmApi, crmUiAlert, project, needs, roles, visibilityOptions) {

      var ts = $scope.ts = CRM.ts('org.civicrm.volunteer');

      $scope.project = project;
      $scope.roles = roles;
      $scope.visibilityOptions = visibilityOptions;

      // Separate scheduled and flexible needs
      $scope.scheduledNeeds = [];
      $scope.flexibleNeed = null;

      // Process needs from API
      _.each(needs, function(need) {
        if (need.is_flexible == '1') {
          $scope.flexibleNeed = need;
        } else {
          // Add display_* properties for date/time formatting
          need.display_start_date = need.start_time ? formatDateForDisplay(need.start_time) : '';
          need.display_start_time = need.start_time ? formatTimeForDisplay(need.start_time) : '';
          need.display_end_date = need.end_time ? formatDateForDisplay(need.end_time) : '';
          need.display_end_time = need.end_time ? formatTimeForDisplay(need.end_time) : '';

          // Determine schedule type based on data
          need.schedule_type = determineScheduleType(need);

          $scope.scheduledNeeds.push(need);
        }
      });

      // If no flexible need exists, create placeholder
      if (!$scope.flexibleNeed) {
        $scope.flexibleNeed = {
          id: 0,
          project_id: project.id,
          is_flexible: '1',
          visibility_id: visibilityOptions.public || '1',
          is_active: '0'
        };
      }

      /**
       * Determine schedule type based on need data
       */
      function determineScheduleType(need) {
        if (!need.start_time) {
          return 'open';
        }
        if (need.duration && !need.end_time) {
          return 'shift';
        }
        if (need.start_time && need.end_time) {
          return 'flexible';
        }
        return '';
      }

      /**
       * Format date for display (from MySQL datetime)
       */
      function formatDateForDisplay(datetime) {
        if (!datetime) return '';
        var date = new Date(datetime);
        var month = ('0' + (date.getMonth() + 1)).slice(-2);
        var day = ('0' + date.getDate()).slice(-2);
        var year = date.getFullYear();
        return month + '/' + day + '/' + year;
      }

      /**
       * Format time for display (from MySQL datetime)
       */
      function formatTimeForDisplay(datetime) {
        if (!datetime) return '';
        var date = new Date(datetime);
        var hours = date.getHours();
        var minutes = ('0' + date.getMinutes()).slice(-2);
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        return hours + ':' + minutes + ' ' + ampm;
      }

      /**
       * Parse display date/time back to MySQL datetime format
       */
      function parseDateTime(dateStr, timeStr) {
        if (!dateStr) return null;

        var date = new Date(dateStr);
        if (timeStr) {
          var timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeParts) {
            var hours = parseInt(timeParts[1]);
            var minutes = parseInt(timeParts[2]);
            var meridiem = timeParts[3].toUpperCase();

            if (meridiem === 'PM' && hours < 12) hours += 12;
            if (meridiem === 'AM' && hours === 12) hours = 0;

            date.setHours(hours, minutes, 0, 0);
          }
        }

        var year = date.getFullYear();
        var month = ('0' + (date.getMonth() + 1)).slice(-2);
        var day = ('0' + date.getDate()).slice(-2);
        var hours = ('0' + date.getHours()).slice(-2);
        var mins = ('0' + date.getMinutes()).slice(-2);
        var secs = ('0' + date.getSeconds()).slice(-2);

        return year + '-' + month + '-' + day + ' ' + hours + ':' + mins + ':' + secs;
      }

      /**
       * Add a new opportunity
       */
      $scope.addNeed = function(roleId) {
        var newNeed = {
          id: 0,
          project_id: project.id,
          role_id: roleId || '',
          quantity: 1,
          start_time: '',
          end_time: '',
          duration: '',
          display_start_date: '',
          display_start_time: '',
          display_end_date: '',
          display_end_time: '',
          schedule_type: '',
          visibility_id: visibilityOptions.public || '1',
          is_active: '1',
          _isNew: true
        };

        $scope.scheduledNeeds.push(newNeed);
        $scope.newNeedRole = ''; // Reset dropdown
      };

      /**
       * Save a need (create or update)
       */
      $scope.saveNeed = function(need) {
        // Build parameters based on schedule type
        var params = {
          id: need.id || undefined,
          project_id: project.id,
          role_id: need.role_id,
          quantity: need.quantity,
          visibility_id: need.visibility_id,
          is_active: need.is_active ? '1' : '0'
        };

        // Handle date/time based on schedule type
        if (need.schedule_type === 'shift') {
          params.start_time = parseDateTime(need.display_start_date, need.display_start_time);
          params.duration = need.duration || '';
          params.end_time = null;
        } else if (need.schedule_type === 'flexible') {
          params.start_time = parseDateTime(need.display_start_date, need.display_start_time);
          params.end_time = parseDateTime(need.display_end_date, need.display_end_time);
          params.duration = null;
        } else if (need.schedule_type === 'open') {
          params.start_time = null;
          params.end_time = null;
          params.duration = null;
        }

        return crmApi('VolunteerNeed', 'create', params).then(
          function(result) {
            if (need._isNew) {
              need.id = result.id;
              need._isNew = false;
            }
            crmUiAlert({text: ts('Opportunity saved'), title: ts('Saved'), type: 'success'});
            return result;
          },
          function(error) {
            crmUiAlert({text: ts('Failed to save opportunity: ') + error.error_message, title: ts('Error'), type: 'error'});
            throw error;
          }
        );
      };

      /**
       * Delete a need
       */
      $scope.deleteNeed = function(need, index) {
        if (need._isNew) {
          // Not saved yet, just remove from array
          $scope.scheduledNeeds.splice(index, 1);
          return;
        }

        // Confirm deletion
        CRM.confirm({
          title: ts('Delete Opportunity'),
          message: ts('Are you sure you want to delete this opportunity?')
        }).on('crmConfirm:yes', function() {
          crmApi('VolunteerNeed', 'delete', {id: need.id}).then(
            function() {
              $scope.scheduledNeeds.splice(index, 1);
              $scope.$apply();
              crmUiAlert({text: ts('Opportunity deleted'), title: ts('Deleted'), type: 'success'});
            },
            function(error) {
              crmUiAlert({text: ts('Failed to delete opportunity: ') + error.error_message, title: ts('Error'), type: 'error'});
            }
          );
        });
      };

      /**
       * Handle schedule type change
       */
      $scope.onScheduleTypeChange = function(need) {
        // Clear incompatible fields when schedule type changes
        if (need.schedule_type === 'open') {
          need.display_start_date = '';
          need.display_start_time = '';
          need.display_end_date = '';
          need.display_end_time = '';
          need.duration = '';
        } else if (need.schedule_type === 'shift') {
          need.display_end_date = '';
          need.display_end_time = '';
        } else if (need.schedule_type === 'flexible') {
          need.duration = '';
        }
      };

      /**
       * Save flexible need
       */
      $scope.saveFlexibleNeed = function() {
        var params = {
          id: $scope.flexibleNeed.id || undefined,
          project_id: project.id,
          is_flexible: '1',
          visibility_id: $scope.flexibleNeed.visibility_id,
          is_active: $scope.flexibleNeed.is_active ? '1' : '0'
        };

        return crmApi('VolunteerNeed', 'create', params).then(
          function(result) {
            if (!$scope.flexibleNeed.id) {
              $scope.flexibleNeed.id = result.id;
            }
            crmUiAlert({text: ts('Flexible signup option saved'), title: ts('Saved'), type: 'success'});
            return result;
          },
          function(error) {
            crmUiAlert({text: ts('Failed to save flexible signup: ') + error.error_message, title: ts('Error'), type: 'error'});
            throw error;
          }
        );
      };

      /**
       * Return to project list
       */
      $scope.done = function() {
        $timeout(function() {
          $location.path('/volunteer/manage');
        });
      };

    }
  );

})(angular, CRM.$, CRM._);
