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

      // Separate scheduled and flexible needs
      $scope.scheduledNeeds = [];
      $scope.flexibleNeed = null;

      // Process needs from API
      _.each(needs, function(need) {
        // Parse assignments for each need
        need.assignments = _.values(need['api.volunteer_assignment.get'].values || {});

        // Calculate vacancy info
        need.quantity = parseInt(need.quantity) || 0;
        need.assignedCount = need.assignments.length;
        need.vacancyCount = need.quantity > need.assignedCount ? need.quantity - need.assignedCount : 0;
        need.hasVacancies = need.vacancyCount > 0;

        if (need.is_flexible == '1') {
          $scope.flexibleNeed = need;
        } else {
          // Format display time
          need.display_time = formatNeedTime(need);
          $scope.scheduledNeeds.push(need);
        }
      });

      // If no flexible need exists, create placeholder
      if (!$scope.flexibleNeed) {
        $scope.flexibleNeed = {
          id: 0,
          project_id: project.id,
          is_flexible: '1',
          assignments: []
        };
      }

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
       * Move volunteer to another need
       */
      $scope.moveVolunteer = function(sourceNeed, assignment, targetNeed) {
        // Check for conflicts
        return checkConflicts(assignment.contact_id, targetNeed, assignment.id).then(function() {
          var statusId = getStatusId(targetNeed.is_flexible == '1' ? 'Available' : 'Scheduled');
          var params = {
            id: assignment.id,
            volunteer_need_id: targetNeed.id,
            status_id: statusId,
            activity_date_time: targetNeed.start_time,
            time_scheduled_minutes: targetNeed.duration,
            volunteer_role_id: targetNeed.role_id
          };

          return crmStatus(
            {start: ts('Moving volunteer...'), success: ts('Volunteer moved')},
            crmApi('VolunteerAssignment', 'create', params)
          ).then(function() {
            // Refresh both needs
            return $q.all([
              refreshNeedAssignments(sourceNeed),
              refreshNeedAssignments(targetNeed)
            ]);
          }, function(error) {
            crmUiAlert({
              text: ts('Failed to move volunteer: ') + error.error_message,
              title: ts('Error'),
              type: 'error'
            });
            throw error;
          });
        }, function(conflictError) {
          crmUiAlert({
            text: conflictError.message || ts('This volunteer is already assigned to another shift at this time.'),
            title: ts('Scheduling Conflict'),
            type: 'error'
          });
          throw conflictError;
        });
      };

      /**
       * Copy volunteer to another need
       */
      $scope.copyVolunteer = function(sourceNeed, assignment, targetNeed) {
        // Check for conflicts
        return checkConflicts(assignment.contact_id, targetNeed).then(function() {
          var statusId = getStatusId(targetNeed.is_flexible == '1' ? 'Available' : 'Scheduled');
          var params = {
            contact_id: assignment.contact_id,
            volunteer_need_id: targetNeed.id,
            status_id: statusId,
            activity_date_time: targetNeed.start_time,
            time_scheduled_minutes: targetNeed.duration,
            volunteer_role_id: targetNeed.role_id,
            details: assignment.details
          };

          return crmStatus(
            {start: ts('Copying volunteer...'), success: ts('Volunteer copied')},
            crmApi('VolunteerAssignment', 'create', params)
          ).then(function() {
            // Refresh target need
            return refreshNeedAssignments(targetNeed);
          }, function(error) {
            crmUiAlert({
              text: ts('Failed to copy volunteer: ') + error.error_message,
              title: ts('Error'),
              type: 'error'
            });
            throw error;
          });
        }, function(conflictError) {
          crmUiAlert({
            text: conflictError.message || ts('This volunteer is already assigned to another shift at this time.'),
            title: ts('Scheduling Conflict'),
            type: 'error'
          });
          throw conflictError;
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
       * Check if a need can accept more volunteers
       */
      $scope.canAcceptVolunteers = function(need) {
        return need.hasVacancies;
      };

      /**
       * Get list of needs that can accept a volunteer being moved/copied
       */
      $scope.getAvailableTargets = function(sourceNeed, assignment) {
        var targets = [];

        // Add flexible need
        targets.push({
          need: $scope.flexibleNeed,
          label: ts('Available Volunteers'),
          time: ''
        });

        // Add scheduled needs with vacancies
        _.each($scope.scheduledNeeds, function(need) {
          // Skip source need for move operations
          if (need.id == sourceNeed.id) {
            return;
          }
          // Only include needs with vacancies
          if (need.hasVacancies || need.quantity === 0) {
            // Check if volunteer is already assigned here
            var alreadyAssigned = _.find(need.assignments, function(a) {
              return a.contact_id == assignment.contact_id;
            });
            if (!alreadyAssigned) {
              targets.push({
                need: need,
                label: roles[need.role_id],
                time: need.display_time
              });
            }
          }
        });

        return targets;
      };

      /**
       * Toggle action menu for assignment
       */
      $scope.toggleMenu = function($event, assignment) {
        $event.preventDefault();
        $event.stopPropagation();

        // Close other menus
        $scope.activeMenu = $scope.activeMenu === assignment.id ? null : assignment.id;
      };

      /**
       * Close all menus when clicking outside
       */
      var documentClickHandler = function(e) {
        if (!$(e.target).closest('.crm-vol-menu').length) {
          $scope.activeMenu = null;
          // Use $evalAsync instead of $apply to avoid digest conflicts
          $scope.$evalAsync();
        }
      };
      $(document).on('click', documentClickHandler);

      // Clean up event listener when controller is destroyed
      $scope.$on('$destroy', function() {
        $(document).off('click', documentClickHandler);
      });

      /**
       * Show volunteer details
       */
      $scope.showDetails = function($event, assignment) {
        $event.preventDefault();
        CRM.alert(assignment.details, assignment.display_name, 'info', {expires: 0});
      };

      /**
       * Volunteer search functionality
       */
      $scope.search = {
        active: false,
        targetNeed: null,
        criteria: {
          sort_name: '',
          group_id: ''
        },
        results: [],
        selected: {},
        pager: {
          offset: 0,
          limit: 25,
          total: 0,
          start: 1,
          end: 0
        }
      };

      /**
       * Open search for a specific need
       */
      $scope.openSearch = function(need) {
        $scope.search.active = true;
        $scope.search.targetNeed = need;
        $scope.search.criteria = {sort_name: '', group_id: ''};
        $scope.search.results = [];
        $scope.search.selected = {};
        $scope.search.pager = {offset: 0, limit: 25, total: 0, start: 1, end: 0};
      };

      /**
       * Close search
       */
      $scope.closeSearch = function() {
        $scope.search.active = false;
        $scope.search.targetNeed = null;
      };

      /**
       * Execute volunteer search
       */
      $scope.executeSearch = function() {
        var params = {
          options: {
            limit: $scope.search.pager.limit,
            offset: $scope.search.pager.offset
          },
          return: ['id', 'display_name', 'sort_name', 'city', 'state_province_name', 'email', 'phone']
        };

        if ($scope.search.criteria.sort_name) {
          params.sort_name = {LIKE: '%' + $scope.search.criteria.sort_name + '%'};
        }
        if ($scope.search.criteria.group_id) {
          params.group = $scope.search.criteria.group_id;
        }

        crmApi('Contact', 'get', params).then(function(result) {
          $scope.search.results = _.values(result.values);
          $scope.search.pager.total = result.count;
          $scope.search.pager.start = $scope.search.pager.offset + 1;
          $scope.search.pager.end = Math.min($scope.search.pager.offset + $scope.search.pager.limit, $scope.search.pager.total);
        });
      };

      /**
       * Navigate search results
       */
      $scope.searchPrevious = function() {
        $scope.search.pager.offset = Math.max(0, $scope.search.pager.offset - $scope.search.pager.limit);
        $scope.executeSearch();
      };

      $scope.searchNext = function() {
        if ($scope.search.pager.offset + $scope.search.pager.limit < $scope.search.pager.total) {
          $scope.search.pager.offset += $scope.search.pager.limit;
          $scope.executeSearch();
        }
      };

      /**
       * Toggle contact selection
       */
      $scope.toggleSelection = function(contactId) {
        if ($scope.search.selected[contactId]) {
          delete $scope.search.selected[contactId];
        } else {
          // Check vacancy limit
          var maxSelect = $scope.search.targetNeed.vacancyCount || 999;
          var currentCount = Object.keys($scope.search.selected).length;
          if (currentCount < maxSelect) {
            $scope.search.selected[contactId] = true;
          } else {
            crmUiAlert({
              text: ts('Maximum %1 volunteers can be selected (based on available vacancies)', {1: maxSelect}),
              title: ts('Limit Reached'),
              type: 'warning'
            });
          }
        }
      };

      /**
       * Select all visible contacts
       */
      $scope.selectAll = function() {
        var maxSelect = $scope.search.targetNeed.vacancyCount || 999;
        var currentCount = Object.keys($scope.search.selected).length;
        var remaining = maxSelect - currentCount;

        _.each($scope.search.results, function(contact, index) {
          if (index < remaining && !$scope.search.selected[contact.id]) {
            $scope.search.selected[contact.id] = true;
          }
        });
      };

      /**
       * Deselect all contacts
       */
      $scope.deselectAll = function() {
        $scope.search.selected = {};
      };

      /**
       * Assign selected volunteers
       */
      $scope.assignSelected = function() {
        var contactIds = Object.keys($scope.search.selected);
        if (contactIds.length === 0) {
          return;
        }

        var need = $scope.search.targetNeed;
        var statusId = getStatusId('Scheduled');
        var assignments = [];

        // Check conflicts for each contact
        var conflictChecks = _.map(contactIds, function(contactId) {
          return checkConflicts(contactId, need).then(
            function() {
              // No conflict - add to assignment list
              assignments.push({
                contact_id: contactId,
                volunteer_need_id: need.id,
                status_id: statusId,
                activity_date_time: need.start_time,
                time_scheduled_minutes: need.duration,
                volunteer_role_id: need.role_id
              });
            },
            function(conflictError) {
              // Conflict detected - show warning but continue with others
              crmUiAlert({
                text: ts('Skipping contact ID %1: ', {1: contactId}) + (conflictError.message || 'Conflict detected'),
                title: ts('Scheduling Conflict'),
                type: 'warning'
              });
            }
          );
        });

        // After all conflict checks, create assignments
        $q.all(conflictChecks).then(function() {
          if (assignments.length === 0) {
            crmUiAlert({
              text: ts('No volunteers could be assigned due to conflicts'),
              title: ts('Assignment Failed'),
              type: 'error'
            });
            return;
          }

          // Create all assignments
          var promises = _.map(assignments, function(params) {
            return crmApi('VolunteerAssignment', 'create', params);
          });

          crmStatus(
            {start: ts('Assigning %1 volunteers...', {1: assignments.length}), success: ts('%1 volunteers assigned', {1: assignments.length})},
            $q.all(promises)
          ).then(function() {
            // Refresh need assignments and close search
            refreshNeedAssignments(need).then(function() {
              $scope.closeSearch();
            });
          }, function(error) {
            crmUiAlert({
              text: ts('Some assignments failed: ') + (error.error_message || 'Unknown error'),
              title: ts('Error'),
              type: 'error'
            });
          });
        });
      };

      /**
       * Get count of selected contacts
       */
      $scope.getSelectedCount = function() {
        return Object.keys($scope.search.selected).length;
      };

      /**
       * Check if contact is selected
       */
      $scope.isSelected = function(contactId) {
        return !!$scope.search.selected[contactId];
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
