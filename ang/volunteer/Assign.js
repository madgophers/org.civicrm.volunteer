(function(angular, $, _) {

  angular.module('volunteer').config(function($routeProvider) {
    $routeProvider.when('/volunteer/project/:projectId/assign', {
      controller: 'VolunteerAssign',
      templateUrl: '~/volunteer/Assign.html',
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
            'api.volunteer_assignment.get': {},
            'is_active': 1,
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
        volunteerStatus: function() {
          // Check if CRM.pseudoConstant exists before accessing
          if (CRM.pseudoConstant && CRM.pseudoConstant.volunteer_status) {
            return CRM.pseudoConstant.volunteer_status;
          }
          // Fallback to empty object
          return {};
        }
      }
    });
  });

  angular.module('volunteer').controller('VolunteerAssign',
    function($scope, $location, $route, $q, crmApi, crmUiAlert, crmStatus, project, needs, roles, volunteerStatus) {

      var ts = $scope.ts = CRM.ts('org.civicrm.volunteer');

      $scope.project = project;
      $scope.roles = roles;
      $scope.volunteerStatus = volunteerStatus;

      // Process scheduled needs from API
      $scope.scheduledNeeds = [];

      _.each(needs, function(need) {
        // Skip flexible needs - we only show scheduled shifts
        if (need.is_flexible == '1') {
          return;
        }

        // Parse assignments for each need
        need.assignments = _.values(need['api.volunteer_assignment.get'].values || {});

        // Calculate vacancy info
        need.quantity = parseInt(need.quantity) || 0;
        need.assignedCount = need.assignments.length;
        need.vacancyCount = need.quantity > need.assignedCount ? need.quantity - need.assignedCount : 0;
        need.hasVacancies = need.vacancyCount > 0;

        // Format display time
        need.display_time = formatNeedTime(need);
        $scope.scheduledNeeds.push(need);
      });

      /**
       * Format time display for a need
       */
      function formatNeedTime(need) {
        if (!need.start_time) {
          return ts('Open-Ended');
        }
        var startDate = new Date(need.start_time);
        var dateStr = formatDate(startDate);
        var timeStr = formatTime(startDate);

        if (need.duration) {
          return dateStr + ' ' + timeStr + ' (' + need.duration + ' min)';
        } else if (need.end_time) {
          var endDate = new Date(need.end_time);
          return dateStr + ' ' + timeStr + ' - ' + formatTime(endDate);
        }
        return dateStr + ' ' + timeStr;
      }

      /**
       * Format date for display
       */
      function formatDate(date) {
        var month = ('0' + (date.getMonth() + 1)).slice(-2);
        var day = ('0' + date.getDate()).slice(-2);
        var year = date.getFullYear();
        return month + '/' + day + '/' + year;
      }

      /**
       * Format time for display
       */
      function formatTime(date) {
        var hours = date.getHours();
        var minutes = ('0' + date.getMinutes()).slice(-2);
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return hours + ':' + minutes + ' ' + ampm;
      }

      /**
       * Get status ID by name
       */
      function getStatusId(statusName) {
        var inverted = _.invert(volunteerStatus);
        return inverted[statusName];
      }

      /**
       * Add volunteer to a need
       */
      $scope.addVolunteer = function(need, contactId) {
        if (!contactId) {
          return;
        }

        // Prevent rapid duplicate calls (debounce guard)
        var callKey = need.id + '_' + contactId;
        var now = Date.now();
        if ($scope._lastAddCall && $scope._lastAddCall.key === callKey && (now - $scope._lastAddCall.time) < 1000) {
          console.log('[VOLUNTEER] Ignoring duplicate addVolunteer call within 1 second');
          return Promise.resolve();
        }
        $scope._lastAddCall = { key: callKey, time: now };

        // Check if volunteer is already assigned to this need
        var alreadyAssigned = _.find(need.assignments, function(assignment) {
          return assignment.contact_id == contactId;
        });

        if (alreadyAssigned) {
          crmUiAlert({
            text: ts('This volunteer is already assigned to this opportunity.'),
            title: ts('Already Assigned'),
            type: 'warning'
          });
          return Promise.resolve();
        }

        // Check for conflicts using Phase 1 conflict detection
        return checkConflicts(contactId, need).then(function() {
          var statusId = getStatusId(need.is_flexible == '1' ? 'Available' : 'Scheduled');
          var params = {
            contact_id: contactId,
            volunteer_need_id: need.id,
            status_id: statusId,
            activity_date_time: need.start_time,
            time_scheduled_minutes: need.duration,
            volunteer_role_id: need.role_id
          };

          return crmStatus(
            {start: ts('Adding volunteer...'), success: ts('Volunteer added')},
            crmApi('VolunteerAssignment', 'create', params)
          ).then(function(result) {
            // Refresh assignments for this need
            return refreshNeedAssignments(need);
          }, function(error) {
            crmUiAlert({
              text: ts('Failed to add volunteer: ') + (error.error_message || 'Unknown error'),
              title: ts('Error'),
              type: 'error'
            });
            throw error;
          });
        }, function(conflictError) {
          // Conflict detected - show warning
          crmUiAlert({
            text: conflictError.message || ts('This volunteer is already assigned to another shift at this time.'),
            title: ts('Scheduling Conflict'),
            type: 'error'
          });
          throw conflictError;
        });
      };

      /**
       * Remove volunteer assignment
       */
      $scope.removeVolunteer = function(need, assignment) {
        CRM.confirm({
          title: ts('Delete Volunteer'),
          message: ts('Remove %1 from %2?', {
            1: assignment.display_name,
            2: need.is_flexible == '1' ? ts('Available Volunteers') : roles[need.role_id]
          })
        }).on('crmConfirm:yes', function() {
          crmStatus(
            {start: ts('Removing volunteer...'), success: ts('Volunteer removed')},
            crmApi('VolunteerAssignment', 'delete', {id: assignment.id})
          ).then(function() {
            // Remove from local array
            var index = need.assignments.indexOf(assignment);
            if (index > -1) {
              need.assignments.splice(index, 1);
            }
            updateVacancyCount(need);
            // No need for $scope.$apply() - crmApi returns Angular promises that auto-digest
          }, function(error) {
            crmUiAlert({
              text: ts('Failed to remove volunteer: ') + error.error_message,
              title: ts('Error'),
              type: 'error'
            });
          });
        });
      };


      /**
       * Check for assignment conflicts using Phase 1 conflict detection
       */
      function checkConflicts(contactId, targetNeed, excludeAssignmentId) {
        // Skip conflict check for flexible needs
        if (targetNeed.is_flexible == '1') {
          return $q.resolve();
        }

        // Check if volunteer is already assigned to this need
        var alreadyAssigned = _.find(targetNeed.assignments, function(a) {
          return a.contact_id == contactId && (!excludeAssignmentId || a.id != excludeAssignmentId);
        });
        if (alreadyAssigned) {
          return $q.reject({message: ts('This volunteer is already assigned to this opportunity.')});
        }

        // Check for conflicts with other scheduled needs
        var conflicts = [];
        _.each($scope.scheduledNeeds, function(need) {
          if (need.id == targetNeed.id) {
            return; // Skip the target need itself
          }
          var isAssigned = _.find(need.assignments, function(a) {
            return a.contact_id == contactId && (!excludeAssignmentId || a.id != excludeAssignmentId);
          });
          if (isAssigned) {
            conflicts.push({
              need: need,
              assignment: isAssigned
            });
          }
        });

        if (conflicts.length > 0) {
          var conflictMessages = _.map(conflicts, function(c) {
            return roles[c.need.role_id] + ' at ' + c.need.display_time;
          });
          return $q.reject({
            message: ts('Scheduling conflict detected. This volunteer is already assigned to:') + '\n• ' + conflictMessages.join('\n• ')
          });
        }

        return $q.resolve();
      }

      /**
       * Refresh assignments for a need
       */
      function refreshNeedAssignments(need) {
        return crmApi('VolunteerAssignment', 'get', {
          volunteer_need_id: need.id
        }).then(function(result) {
          need.assignments = _.values(result.values);
          updateVacancyCount(need);
          // No need for $scope.$apply() - crmApi returns Angular promises that auto-digest
          return need;
        });
      }

      /**
       * Update vacancy count for a need
       */
      function updateVacancyCount(need) {
        need.assignedCount = need.assignments.length;
        need.vacancyCount = need.quantity > need.assignedCount ? need.quantity - need.assignedCount : 0;
        need.hasVacancies = need.vacancyCount > 0 || need.quantity === 0;
      }


      /**
       * Show volunteer details
       */
      $scope.showDetails = function($event, assignment) {
        $event.preventDefault();
        CRM.alert(assignment.details, assignment.display_name, 'info', {expires: 0});
      };

      /**
       * Return to project list
       */
      $scope.done = function() {
        $location.path('/volunteer/manage');
      };

    }
  );

})(angular, CRM.$, CRM._);
