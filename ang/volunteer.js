(function(angular, $, _) {
  // Declare a list of dependencies.
  angular
    .module('volunteer', CRM.angRequires('volunteer'))

    // Makes lodash/underscore available in templates
    .run(function($rootScope) {
      $rootScope._ = _;
    })

    // Show/hide "loading" spinner between routes
    .run(function($rootScope) {
      $rootScope.$on('$routeChangeStart', function() {
        CRM.$('#crm-main-content-wrapper').block();
      });

      $rootScope.$on('$routeChangeSuccess', function() {
        CRM.$('#crm-main-content-wrapper').unblock();
      });

      $rootScope.$on('$routeChangeError', function() {
        CRM.$('#crm-main-content-wrapper').unblock();
      });

      // the first route that is loaded fires a $routeChangeSuccess event on
      // completing load, but it doesn't raise $routeChangeStart when it starts,
      // so we will just start the app with the spinner going
      CRM.$('#crm-main-content-wrapper').block();
    })

    .factory('volOppSearch', ['crmApi', '$location', '$route', function(crmApi, $location, $route) {
      //Search params and results are stored here and assigned by reference to the form
      var volOppSearch = {};
      var result = {};

      /**
       * This translates the url params with nested key names
       * into a complex object format that Angular can assign to form objects
       * VOL-240
       *
       * @param params
       * @returns complex object
       */
      var parseQueryParams = function(params) {
        var returnParams = {};
        _.each(params, function(value, name) {
          //Get the base name. will return whole key if no mathing bracket is found.
          var basename = name.replace(/([^\[]*)\[.*/g, "$1");
          //If we have subkeys
          if (basename.length < name.length) {
            var tmp = returnParams[basename] || {};
            //This gives us an array of the key of each level
            var path = name.replace(basename + "[", "").slice(0, -1).split("][");
            var ptr = tmp;
            var last = path.length - 1;
            for(var i in path) {
              //Set the value
              if (i == last) {
                ptr[path[i]] = value;
              } else {
                //If the path doesn't exist, create it.
                if(!ptr.hasOwnProperty(path[i])) {
                  ptr[path[i]] = {};
                }
                //Move the Pointer
                ptr = ptr[path[i]];
              }
            }
            //Set the value in our return object.
            returnParams[basename] = tmp;
          } else {
            returnParams[basename] = value;
          }
        });

        // The radius field is of type number; Angular errors if the value is a string
        if (returnParams['proximity'] && returnParams['proximity']['radius']) {
          returnParams['proximity']['radius'] = parseFloat(returnParams['proximity']['radius']);
        }

        return returnParams;
      };

      volOppSearch.params = parseQueryParams($route.current.params);

      var clearResult = function() {
        result = {};
      };

      /**
       * Formats the search params for bookmarkable links.
       *
       * @return string
       */
      var buildQueryString = function () {
        // VOL-187: The beneficiary widget is an entityRef; it expects values as CSV rather than an array.
        if (volOppSearch.params.beneficiary && typeof volOppSearch.params.beneficiary !== "string") {
          volOppSearch.params.beneficiary = volOppSearch.params.beneficiary.join(',');
        }

        // clean up the URL by filtering out those params with falsy values
        var cleanUpSearchParams = function (params) {
          return _.transform(params, function (result, value, key) {
            if (typeof value == 'object') {
              result[key] = cleanUpSearchParams(value);
            } else if (value) {
              result[key] = value;
            }
          });
        };
        var searchParams = cleanUpSearchParams(volOppSearch.params);

        // jQuery.param properly handles complex objects (recursively); if we don't do this,
        // we end up with URLs like "proximity=[Object]"
        return CRM.$.param(searchParams);
      }

      volOppSearch.search = function() {
        clearResult();

        //Update the URL for bookmarkability
        $location.search(buildQueryString());

        // VOL-187: The beneficiary widget is an entityRef, so the value arrives as CSV rather than an array.
        if (volOppSearch.params.beneficiary && typeof volOppSearch.params.beneficiary === "string") {
          volOppSearch.params.beneficiary = volOppSearch.params.beneficiary.split(',');
        }

        return crmApi('VolunteerNeed', 'getsearchresult', volOppSearch.params).then(function(data) {
          result = data.values;
        });
      };

      //We are returning this as a function because there is a bug that causes
      //the 'result' to be unbound on the client side (eg, the listing is never refreshed)
      //this function acts as a closure and maintains binding
      volOppSearch.results = function results() { return result; };

      return volOppSearch;

    }])


    // Example: <div crm-vol-perm-to-class></div>
    // Adds a class to the element for each volunteer permission the user has.
    // This does not provide security but a better UX; i.e., don't show me
    // buttons I can't use.
    .directive('crmVolPermToClass', function(crmApi) {
      return {
        restrict: 'A',
        scope: {},
        link: function (scope, element, attrs) {
          var classes = [];
          crmApi('VolunteerUtil', 'getperms').then(function(perms) {
            angular.forEach(perms.values, function(value) {
              if (CRM.checkPerm(value.name) === true) {
                classes.push('crm-vol-perm-' + value.safe_name);
              }
            });

            $(element).addClass(classes.join(' '));
          });
        }
      };
    });

    // Phase 2 Complete: All Backbone/Marionette code has been removed
    // The volBackbone factory was here (lines 168-378 in original file)
    // It's no longer needed as all UIs have been migrated to Angular

})(angular, CRM.$, CRM._);
