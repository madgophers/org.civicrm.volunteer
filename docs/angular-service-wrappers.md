# Angular Service Wrappers for CiviCRM Functions

## Overview

The `crmWrappers.js` file provides Angular-friendly service wrappers around CiviCRM's global `CRM.*` functions. These wrappers ensure proper Angular digest cycle integration and provide promise-based APIs for better testability and code clarity.

## Why Use These Wrappers?

### Problems with Direct CRM.* Usage:

1. **Digest Cycle Issues**: CRM functions don't trigger Angular's digest cycle, requiring manual `$scope.$apply()` calls
2. **Hard to Test**: Global `CRM` object is difficult to mock in unit tests
3. **Callback Hell**: jQuery-style event callbacks (`.on('event', fn)`) instead of promises
4. **Inconsistent Patterns**: Mix of different callback styles throughout codebase

### Benefits of Wrappers:

1. ✅ **Automatic Digest Integration**: All wrappers use `$timeout` to ensure Angular updates
2. ✅ **Testable**: Easy to mock services in unit tests
3. ✅ **Promise-Based**: Modern `.then()/.catch()` instead of event callbacks
4. ✅ **Consistent Code**: Same pattern everywhere
5. ✅ **Type Safety**: Clearer function signatures

---

## Available Services

### `crmAlert`

Angular wrapper for `CRM.alert()` - display alert/notification messages.

**Usage:**
```javascript
angular.module('volunteer').controller('MyController', function($scope, crmAlert) {

  // Success message
  crmAlert('Project saved successfully', 'Success', 'success');

  // Error message
  crmAlert('Failed to save project', 'Error', 'error');

  // Info message with options
  crmAlert('This is important', 'Notice', 'info', {expires: 0});

});
```

**Parameters:**
- `text` (string): Message text
- `title` (string): Alert title
- `type` (string): Alert type ('success', 'error', 'info', 'warning')
- `options` (object, optional): Additional options (e.g., `{expires: 0}` for non-expiring)

---

### `crmConfirm`

Angular wrapper for `CRM.confirm()` - display confirmation dialogs.

Returns a **promise** that resolves on "yes" and rejects on "no".

**Before (old pattern with callbacks):**
```javascript
CRM.confirm({message: 'Delete this project?'})
  .on('crmConfirm:yes', function() {
    $scope.$apply(function() {
      deleteProject();
    });
  });
```

**After (using crmConfirm service):**
```javascript
angular.module('volunteer').controller('MyController', function($scope, crmConfirm) {

  crmConfirm({message: 'Delete this project?'})
    .then(function() {
      // User clicked "yes"
      deleteProject();
    })
    .catch(function() {
      // User clicked "no" or closed dialog
      console.log('Cancelled');
    });

});
```

**Advanced Example:**
```javascript
crmConfirm({
  title: 'Confirm Deletion',
  message: 'Are you sure you want to delete this project? This cannot be undone.'
}).then(function() {
  return crmApi('VolunteerProject', 'delete', {id: project.id});
}).then(function() {
  crmAlert('Project deleted', 'Success', 'success');
}).catch(function(error) {
  if (error) {
    crmAlert('Failed to delete: ' + error.error_message, 'Error', 'error');
  }
});
```

---

### `crmDialog`

Angular wrapper for CiviCRM dialog functions (`CRM.loadForm`, `CRM.loadPage`).

#### `crmDialog.loadForm(url, settings)`

Load a CiviCRM form in a modal dialog. Returns a promise that resolves when form is successfully submitted.

**Before (old pattern):**
```javascript
CRM.loadForm(url, settings).on('crmFormSuccess', function(event, data) {
  $scope.$apply(function() {
    $route.reload();
  });
});
```

**After (using crmDialog service):**
```javascript
angular.module('volunteer').controller('MyController', function($scope, crmDialog, crmUrl, $route) {

  $scope.showLogHours = function(projectId) {
    var url = crmUrl('civicrm/volunteer/loghours', 'reset=1&action=add&vid=' + projectId);
    var settings = {dialog: {width: '85%', height: '80%'}};

    crmDialog.loadForm(url, settings)
      .then(function(data) {
        // Form submitted successfully
        $route.reload(); // Refresh data
        crmAlert('Hours logged successfully', 'Success', 'success');
      })
      .catch(function(error) {
        // Form closed without submitting or error occurred
        if (error) {
          crmAlert('Failed to log hours', 'Error', 'error');
        }
      });
  };

});
```

#### `crmDialog.loadPage(url, settings)`

Load a CiviCRM page in a modal dialog. Returns a promise that resolves when dialog closes.

**Example:**
```javascript
$scope.showRoster = function(projectId) {
  var url = crmUrl('civicrm/volunteer/roster', 'project_id=' + projectId);
  var settings = {dialog: {width: '85%', height: '80%'}};

  crmDialog.loadPage(url, settings)
    .then(function() {
      // Dialog closed - refresh data
      $route.reload();
    });
};
```

---

### `crmUrl`

Angular wrapper for `CRM.url()` - generate CiviCRM URLs.

This is a simple pass-through for consistency with other `crm*` services.

**Usage:**
```javascript
angular.module('volunteer').controller('MyController', function($scope, crmUrl) {

  var url = crmUrl('civicrm/volunteer/loghours', 'reset=1&action=add&vid=123');
  // Returns: "/civicrm/volunteer/loghours?reset=1&action=add&vid=123"

});
```

---

## Migration Guide

### How to Update Existing Code

1. **Add service dependencies to controller:**
```javascript
// Before
angular.module('volunteer').controller('MyCtrl', function($scope, crmApi) {

// After
angular.module('volunteer').controller('MyCtrl', function($scope, crmApi, crmConfirm, crmAlert, crmDialog, crmUrl) {
```

2. **Replace CRM.alert() calls:**
```javascript
// Before
CRM.alert('Success!', 'Saved', 'success');

// After
crmAlert('Success!', 'Saved', 'success');
```

3. **Replace CRM.confirm() calls:**
```javascript
// Before
CRM.confirm({message: 'Delete?'})
  .on('crmConfirm:yes', function() {
    $scope.$apply(function() {
      doDelete();
    });
  });

// After
crmConfirm({message: 'Delete?'})
  .then(function() {
    doDelete(); // No need for $scope.$apply()
  });
```

4. **Replace CRM.loadForm() calls:**
```javascript
// Before
CRM.loadForm(url, settings).on('crmFormSuccess', function(event, data) {
  $scope.$apply(function() {
    $route.reload();
  });
});

// After
crmDialog.loadForm(url, settings)
  .then(function(data) {
    $route.reload(); // No need for $scope.$apply()
  });
```

5. **Replace CRM.url() calls:**
```javascript
// Before
var url = CRM.url('civicrm/volunteer/loghours', params);

// After
var url = crmUrl('civicrm/volunteer/loghours', params);
```

---

## Testing Benefits

### Before (hard to test):
```javascript
function deleteProject(project) {
  CRM.confirm({message: 'Delete project?'})
    .on('crmConfirm:yes', function() {
      crmApi('VolunteerProject', 'delete', {id: project.id});
    });
}

// Test is difficult:
// - Can't mock CRM global
// - Can't easily trigger 'crmConfirm:yes' event
// - Hard to verify API call
```

### After (easy to test):
```javascript
function deleteProject(project) {
  crmConfirm({message: 'Delete project?'})
    .then(function() {
      return crmApi('VolunteerProject', 'delete', {id: project.id});
    });
}

// Test is easy:
describe('deleteProject', function() {
  it('should delete project when confirmed', function() {
    var crmConfirm = jasmine.createSpy().and.returnValue($q.resolve());
    var crmApi = jasmine.createSpy().and.returnValue($q.resolve());

    deleteProject(project);
    $scope.$digest();

    expect(crmConfirm).toHaveBeenCalledWith({message: 'Delete project?'});
    expect(crmApi).toHaveBeenCalledWith('VolunteerProject', 'delete', {id: project.id});
  });
});
```

---

## Current Usage

The service wrappers are currently used in:

- **Projects.js**: `showLogHours()`, `showRoster()` - demonstrate crmDialog usage

### Future Migration Opportunities

These files could benefit from using the wrappers:

1. **Projects.js**:
   - Line 18: `CRM.alert()` → `crmAlert()`
   - Line 154: `CRM.alert()` → `crmAlert()`

2. **Project.js**:
   - Lines 26-30, 204, 281, 287, 293, 306, 318, 350: `CRM.alert()` → `crmAlert()`
   - Line 496: `CRM.alert()` (preview description - can stay as is)

3. **Assign.js**:
   - Line 442: `CRM.alert()` → `crmAlert()`
   - Lines 182-208: `CRM.confirm()` → `crmConfirm()`

4. **Needs.js**:
   - Lines 241-255: `CRM.confirm()` → `crmConfirm()`

5. **VolOppsCtrl.js**:
   - Lines 174, 178: `CRM.alert()` → `crmAlert()`

**Note:** These migrations are optional but recommended for consistency and testability.

---

## Best Practices

1. **Always inject services explicitly:**
   ```javascript
   // Good
   function MyController($scope, crmAlert, crmConfirm) { }

   // Bad
   function MyController($scope) {
     CRM.alert(...); // Direct global usage
   }
   ```

2. **Use promise chaining:**
   ```javascript
   // Good
   crmConfirm({message: 'Delete?'})
     .then(function() {
       return crmApi('Entity', 'delete', {id: 123});
     })
     .then(function() {
       crmAlert('Deleted!', 'Success', 'success');
     })
     .catch(function(error) {
       crmAlert('Failed!', 'Error', 'error');
     });

   // Bad
   crmConfirm({message: 'Delete?'}).then(function() {
     crmApi('Entity', 'delete', {id: 123}).then(function() {
       crmAlert('Deleted!', 'Success', 'success');
     }, function(error) {
       crmAlert('Failed!', 'Error', 'error');
     });
   });
   ```

3. **Handle both success and failure:**
   ```javascript
   crmDialog.loadForm(url, settings)
     .then(function(data) {
       // Handle success
     })
     .catch(function(error) {
       // Handle failure (even if just logging)
     });
   ```

---

## Implementation Details

All service wrappers use `$timeout` to ensure Angular's digest cycle runs:

```javascript
angular.module('volunteer').service('crmAlert', function($timeout) {
  return function(text, title, type, options) {
    $timeout(function() {
      CRM.alert(text, title, type, options);
    });
  };
});
```

This ensures that any scope changes triggered by the CRM function are properly detected by Angular.

---

## Future Enhancements

Potential additions to `crmWrappers.js`:

1. **crmApi wrapper**: Could add additional error handling or logging
2. **crmStatus wrapper**: Already exists in crmUtil, could create alias
3. **Event emitters**: Angular-style event emitters for CRM events
4. **Interceptors**: Add request/response interceptors for all CRM calls

---

## References

- **File:** `/ang/volunteer/crmWrappers.js`
- **Registration:** `/ang/volunteer.ang.php` (line 13)
- **Example Usage:** `/ang/volunteer/Projects.js` (lines 165-191)
