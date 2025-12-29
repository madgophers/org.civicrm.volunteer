# Phase 2: Modernize Backbone UI to Angular

**Status:** PROPOSED - Awaiting Approval
**Created:** 2025-12-28
**Version Target:** 2.6.0 (Modernized)

---

## Executive Summary

Replace the deprecated Backbone.js + Marionette.js UI components with modern AngularJS implementation to achieve full compatibility with CiviCRM 6.9.1+.

**Why Phase 2 is Required:**
- CiviCRM 6.9.1 removed Backbone.js and Marionette.js libraries
- Three major UI components are currently broken:
  1. Define Opportunities (volunteer needs management)
  2. Assign Volunteers (volunteer assignment/roster)
  3. Search Opportunities (public volunteer search)

**Approach:**
Rebuild each Backbone view as an Angular view using CiviCRM's existing Angular patterns, following the same architecture already proven successful in Project management UI (Phase 0).

---

## Current State Analysis

### Working Components (Angular-based):
- ✅ Project creation/editing (`ang/volunteer/Project.js` + `.html`)
- ✅ Project listing (`ang/volunteer/Projects.js` + `.html`)
- ✅ API layer (all `api/v3/Volunteer*.php` files)
- ✅ Business logic (all `CRM/Volunteer/BAO/*.php` files)

### Broken Components (Backbone-based):
- ❌ Define Opportunities (`js/backbone/apps/define/`)
- ❌ Assign Volunteers (`js/backbone/apps/assign/`)
- ❌ Search Opportunities (`js/backbone/apps/search/`)
- ❌ Volunteer app initialization (`js/backbone/apps/volunteer_app.js`)

### Files to Replace/Remove:
```
js/backbone/                          ← DELETE entire directory after migration
  ├── apps/
  │   ├── volunteer_app.js           ← Backbone/Marionette app
  │   ├── define/                     ← Define UI
  │   │   ├── define_controller.js
  │   │   └── define_views.js
  │   ├── assign/                     ← Assign UI
  │   │   ├── assign_controller.js
  │   │   └── assign_views.js
  │   └── search/                     ← Search UI
  │       ├── search_controller.js
  │       └── search_views.js
  ├── entities/                        ← Backbone models (migrate to Angular services)
  │   ├── needs.js
  │   ├── assignments.js
  │   └── contacts.js
  └── apps/_utils/renderutils.js      ← Utility functions

templates/CRM/Volunteer/Page/Backbone*.tpl  ← DELETE after migration
CRM/Volunteer/Page/Backbone.php             ← DELETE or repurpose
ang/volunteer.js (volBackbone service)      ← REMOVE loadBackboneCore function
```

---

## Phase 2 Architecture

### New Angular Structure:

```
ang/volunteer/
  ├── Needs.js          ← NEW: Define Opportunities controller
  ├── Needs.html        ← NEW: Define Opportunities template
  ├── Assign.js         ← NEW: Assign Volunteers controller
  ├── Assign.html       ← NEW: Assign Volunteers template
  ├── Search.js         ← NEW: Search Opportunities controller
  ├── Search.html       ← NEW: Search Opportunities template
  ├── VolOppsCtrl.js    ← EXISTING: Update for new routes
  ├── VolOppsCtrl.html  ← EXISTING: Opportunity list view
  ├── Project.js        ← EXISTING: Keep as-is
  ├── Project.html      ← EXISTING: Keep as-is
  ├── Projects.js       ← EXISTING: Update to remove Backbone dependency
  └── Projects.html     ← EXISTING: Keep as-is

ang/volunteer.js        ← EXISTING: Remove volBackbone service, add new services
ang/volunteer.ang.php   ← EXISTING: Update Angular module config
```

---

## Detailed Migration Plan

### **Component 1: Define Opportunities UI**

**Current Implementation:**
- Location: `js/backbone/apps/define/`
- Functionality: Create/edit volunteer opportunities (needs)
- Used by: "Continue" button after project creation, "Define" link in project list

**New Angular Implementation:**

**1.1 Create Angular Controller** (`ang/volunteer/Needs.js`)
```javascript
angular.module('volunteer').config(function($routeProvider) {
  $routeProvider.when('/volunteer/project/:projectId/needs', {
    controller: 'VolunteerNeeds',
    templateUrl: '~/volunteer/Needs.html',
    resolve: {
      project: function(crmApi, $route) {
        return crmApi('VolunteerProject', 'getsingle', {
          id: $route.current.params.projectId
        });
      },
      needs: function(crmApi, $route) {
        return crmApi('VolunteerNeed', 'get', {
          project_id: $route.current.params.projectId,
          options: {limit: 0}
        });
      },
      roles: function(crmApi) {
        return crmApi('VolunteerUtil', 'getsupportingdata', {
          controller: 'VolOppsCtrl'
        }).then(function(result) {
          return result.values.roles;
        });
      }
    }
  });
});

angular.module('volunteer').controller('VolunteerNeeds',
  function($scope, $location, crmApi, crmUiAlert, project, needs, roles) {
    // Controller implementation
  }
);
```

**1.2 Create Angular Template** (`ang/volunteer/Needs.html`)
- Form to create/edit volunteer opportunities
- Fields: role, start_time, end_time, quantity, is_flexible, visibility
- List of existing opportunities with edit/delete actions
- Use CiviCRM's `crm-ui-field`, `crm-ui-date-time` directives

**1.3 Update Routes**
- Change "Continue" button to: `$location.path('/volunteer/project/' + projectId + '/needs')`
- Remove `volBackbone.load()` dependency

**Files to Create:**
- `ang/volunteer/Needs.js` (~200 lines)
- `ang/volunteer/Needs.html` (~150 lines)

**Files to Modify:**
- `ang/volunteer/Project.js` (update saveAndNextCallback)
- `ang/volunteer/Projects.html` (update "Define" link)

**Estimated Effort:** 8-12 hours

---

### **Component 2: Assign Volunteers UI**

**Current Implementation:**
- Location: `js/backbone/apps/assign/`
- Functionality: Assign volunteers to opportunities, view roster
- Used by: "Assign" link in project list

**New Angular Implementation:**

**2.1 Create Angular Controller** (`ang/volunteer/Assign.js`)
```javascript
angular.module('volunteer').config(function($routeProvider) {
  $routeProvider.when('/volunteer/project/:projectId/assign', {
    controller: 'VolunteerAssign',
    templateUrl: '~/volunteer/Assign.html',
    resolve: {
      project: function(crmApi, $route) {
        return crmApi('VolunteerProject', 'getsingle', {
          id: $route.current.params.projectId
        });
      },
      needs: function(crmApi, $route) {
        return crmApi('VolunteerNeed', 'get', {
          project_id: $route.current.params.projectId,
          options: {limit: 0}
        });
      },
      assignments: function(crmApi, $route) {
        return crmApi('VolunteerAssignment', 'get', {
          project_id: $route.current.params.projectId,
          options: {limit: 0}
        });
      }
    }
  });
});

angular.module('volunteer').controller('VolunteerAssign',
  function($scope, $location, crmApi, crmUiAlert, project, needs, assignments) {
    // Controller implementation
    // Include conflict detection from CRM_Volunteer_BAO_ConflictChecker
  }
);
```

**2.2 Create Angular Template** (`ang/volunteer/Assign.html`)
- Grid/list showing opportunities and assigned volunteers
- Contact search widget to find volunteers
- Assignment interface with conflict detection warnings
- Roster view showing all assignments

**2.3 Integrate Conflict Detection**
- Use `VolunteerAssignment` API which already has conflict detection (Phase 1)
- Display conflict warnings before assigning
- Allow force-assign if administrator approves

**Files to Create:**
- `ang/volunteer/Assign.js` (~250 lines)
- `ang/volunteer/Assign.html` (~200 lines)

**Files to Modify:**
- `ang/volunteer/Projects.html` (update "Assign" link)

**Estimated Effort:** 10-14 hours

---

### **Component 3: Search Opportunities UI**

**Current Implementation:**
- Location: `js/backbone/apps/search/`
- Functionality: Public-facing volunteer opportunity search
- Used by: Public volunteer signup pages

**New Angular Implementation:**

**3.1 Create Angular Controller** (`ang/volunteer/Search.js`)
```javascript
angular.module('volunteer').config(function($routeProvider) {
  $routeProvider.when('/volunteer/opportunities', {
    controller: 'VolunteerSearch',
    templateUrl: '~/volunteer/Search.html',
    resolve: {
      opportunities: function(crmApi) {
        return crmApi('VolunteerNeed', 'get', {
          is_active: 1,
          options: {limit: 0}
        });
      },
      projects: function(crmApi) {
        return crmApi('VolunteerProject', 'get', {
          is_active: 1,
          options: {limit: 0}
        });
      }
    }
  });
});

angular.module('volunteer').controller('VolunteerSearch',
  function($scope, $location, crmApi, opportunities, projects) {
    // Controller implementation
    // Search/filter functionality
    // Public signup workflow
  }
);
```

**3.2 Create Angular Template** (`ang/volunteer/Search.html`)
- Search filters (date range, location, role, etc.)
- Grid/list of available opportunities
- Signup button/link for each opportunity
- Integration with volunteer registration profiles

**3.3 Public Access Considerations**
- Ensure route is publicly accessible (check permissions)
- Optimize for non-logged-in users
- Mobile-friendly responsive design

**Files to Create:**
- `ang/volunteer/Search.js` (~200 lines)
- `ang/volunteer/Search.html` (~180 lines)

**Files to Modify:**
- `ang/volunteer.ang.php` (ensure public route access)
- Update menu links to new route

**Estimated Effort:** 8-12 hours

---

### **Component 4: Cleanup & Migration**

**4.1 Remove Backbone Dependencies**

Files to Delete:
```bash
rm -rf js/backbone/
rm templates/CRM/Volunteer/Page/Backbone.tpl
rm templates/CRM/Volunteer/Page/Backbone/*.tpl
rm CRM/Volunteer/Page/Backbone.php
```

**4.2 Update Angular Module** (`ang/volunteer.js`)

Remove:
- `volBackbone` factory (lines 170-390)
- All Backbone loading logic
- `loadBackboneCore()`, `loadScripts()`, `loadTemplate()` functions

Add:
- Angular services for needs, assignments (if needed beyond API)
- Shared utilities for conflict detection display

**4.3 Update Angular Config** (`ang/volunteer.ang.php`)

No changes needed - already configured for Angular routes.

**4.4 Update Menu Links** (`xml/Menu/Volunteer.xml`)

Update any hardcoded Backbone URLs to new Angular routes.

**Estimated Effort:** 4-6 hours

---

### **Component 5: Testing & Quality Assurance**

**5.1 Unit Testing**
- Test each Angular controller
- Test API interactions
- Test conflict detection logic

**5.2 Integration Testing**
- Complete volunteer workflow:
  1. Create project
  2. Define opportunities
  3. Assign volunteers (test conflict detection)
  4. Public search and signup
- Test all menu navigation
- Test permissions for different user roles

**5.3 Compatibility Testing**
- Test on CiviCRM 6.9.1
- Test with different CMS backends (WordPress, Drupal, Joomla)
- Test responsive design on mobile/tablet

**5.4 Regression Testing**
- Verify Phase 0/1 features still work
- Verify existing data displays correctly
- Verify conflict detection still functions

**Estimated Effort:** 8-10 hours

---

## Implementation Timeline

### Recommended Sequence:

**Week 1: Component 1 - Define Opportunities**
- Days 1-2: Create `Needs.js` controller and routing
- Days 3-4: Create `Needs.html` template and styling
- Day 5: Integration and testing

**Week 2: Component 2 - Assign Volunteers**
- Days 1-3: Create `Assign.js` controller with conflict detection
- Days 4-5: Create `Assign.html` template and roster view
- Testing throughout

**Week 3: Component 3 - Search Opportunities**
- Days 1-2: Create `Search.js` controller and public access
- Days 3-4: Create `Search.html` template
- Day 5: Public signup workflow testing

**Week 4: Cleanup & QA**
- Days 1-2: Remove Backbone code, cleanup
- Days 3-5: Comprehensive testing and bug fixes

**Total Estimated Time:** 30-40 hours of development

---

## Technical Approach

### Following CiviCRM Angular Patterns:

**1. Use CiviCRM's Angular Directives:**
- `crm-ui-field` - Form fields with automatic labels
- `crm-ui-date-time` - Date/time pickers
- `crm-entityref` - Entity reference (contact, project selection)
- `crm-ui-accordion` - Collapsible sections
- `crm-ui-alert` - User notifications

**2. Use CiviCRM's Angular Services:**
- `crmApi` - API v3 calls
- `crmUiAlert` - Toast notifications
- `crmUiHelp` - Contextual help
- `crmStatus` - Loading indicators
- `$route`, `$location` - Routing

**3. Follow Existing Patterns:**
- Look at `ang/volunteer/Project.js` as template
- Match validation patterns
- Reuse resolver patterns for data loading
- Consistent error handling

---

## API Changes Required

### Minimal - APIs Already Exist:

**Existing APIs (no changes needed):**
- ✅ `VolunteerProject` - Project CRUD
- ✅ `VolunteerNeed` - Opportunity CRUD
- ✅ `VolunteerAssignment` - Assignment CRUD with conflict detection (Phase 1)
- ✅ `VolunteerUtil.getsupportingdata` - Roles and other metadata

**Potential New APIs (optional enhancements):**
- `VolunteerNeed.getavailable` - Get available (unfilled) opportunities
- `VolunteerAssignment.checkconflict` - Explicit conflict check before assignment
  (Currently embedded in Assignment create/update)

**Estimated Effort:** 2-4 hours (if new APIs needed)

---

## Data Migration

**Good News: NO DATA MIGRATION REQUIRED**

- All database tables remain unchanged
- Existing projects, needs, and assignments work with new UI
- Only the *presentation layer* is changing
- Data structures are identical

---

## Rollback Plan

**If Phase 2 needs to be rolled back:**

1. **Keep Phase 0/1 changes** (they're stable and working)
2. **Revert Phase 2 commits**
3. **Restore Backbone files from pre-Phase 2 commit**
4. **Problem:** Backbone still won't work with CiviCRM 6.9.1

**Better Approach:**
- Develop Phase 2 on a separate branch
- Test thoroughly before merging
- Use feature flags if partial rollback needed

---

## Risks & Mitigation

### Risk 1: Angular Version Compatibility
**Risk:** CiviCRM's Angular might have breaking changes
**Mitigation:**
- We're already using Angular successfully (Project UI)
- Follow existing patterns exactly
- Test on actual CiviCRM 6.9.1 installation

### Risk 2: Feature Parity
**Risk:** Missing some Backbone features in Angular version
**Mitigation:**
- Document all Backbone features before starting
- User acceptance testing throughout
- Maintain feature checklist

### Risk 3: Public Search Permissions
**Risk:** Angular routes might not handle public access correctly
**Mitigation:**
- Test public access early
- Review CiviCRM's public Angular pages as examples
- May need `basePages` configuration in `volunteer.ang.php`

### Risk 4: Timeline Overruns
**Risk:** Development takes longer than estimated
**Mitigation:**
- Build incrementally (one component at a time)
- Each component is independently testable
- Can ship partial implementations if needed

---

## Success Criteria

### Phase 2 is complete when:

1. ✅ **Define Opportunities works:**
   - Can create/edit/delete volunteer opportunities
   - All fields functional (role, time, quantity, etc.)
   - Flexible needs supported

2. ✅ **Assign Volunteers works:**
   - Can assign volunteers to opportunities
   - Conflict detection displays warnings
   - Roster view shows all assignments
   - Can edit/delete assignments

3. ✅ **Search Opportunities works:**
   - Public can search available opportunities
   - Filters work (date, location, role)
   - Signup process completes successfully

4. ✅ **All Backbone code removed:**
   - `js/backbone/` directory deleted
   - No Backbone references in code
   - No console errors about missing Backbone

5. ✅ **Integration works end-to-end:**
   - Complete workflow: Create project → Define needs → Assign volunteers → Public search
   - All menu navigation functional
   - No broken links or routes

6. ✅ **Tests pass:**
   - No regressions in Phase 0/1 features
   - New features tested and working
   - Compatible with CiviCRM 6.9.1

---

## Post-Phase 2: Future Enhancements

After Phase 2 is stable, consider:

**Phase 3: Advanced Features**
- Volunteer hours logging enhancements
- Advanced conflict resolution UI
- Volunteer availability calendars
- Email notifications for assignments
- Volunteer commendations system

**Phase 4: Modern Framework Migration**
- Evaluate migrating from AngularJS 1.x to modern framework
- CiviCRM may migrate to React/Vue in future
- Follow CiviCRM's core framework decisions

---

## Alternative Approaches (Rejected)

### Alternative 1: Bundle Backbone/Marionette Libraries
**Pros:** Quick fix, minimal code changes
**Cons:**
- Using deprecated libraries (bad practice)
- Version conflicts with other extensions
- Technical debt accumulates
- Not sustainable long-term
**Decision:** REJECTED

### Alternative 2: Rewrite in React/Vue
**Pros:** Modern framework, better performance
**Cons:**
- CiviCRM uses AngularJS 1.x throughout
- Would be inconsistent with core
- More complex integration
- Higher development effort
**Decision:** REJECTED

### Alternative 3: Server-Side Rendering Only
**Pros:** No JavaScript framework needed
**Cons:**
- Poor user experience (page reloads)
- Doesn't match CiviCRM UX patterns
- Loses interactivity
**Decision:** REJECTED

**Chosen Approach:** Migrate to Angular (matches CiviCRM core, proven pattern)

---

## Resources Needed

### Development Resources:
- **Developer Time:** 30-40 hours
- **Testing Time:** 8-10 hours
- **Code Review:** 2-4 hours

### Technical Resources:
- CiviCRM 6.9.1 test environment
- Access to various CMS backends for testing
- Sample volunteer data for testing

### Documentation:
- [CiviCRM Angular Documentation](https://docs.civicrm.org/dev/en/latest/framework/angular/)
- Existing `ang/volunteer/Project.js` as template
- CiviCRM core Angular examples

---

## Approval & Sign-Off

**Phase 2 Plan Status:** PROPOSED - Awaiting User Approval

**Questions for User:**
1. Does this approach make sense given the Backbone/Marionette removal?
2. Is the timeline acceptable (3-4 weeks estimated)?
3. Are there any specific features or requirements not covered?
4. Should we proceed with Phase 2, or are there other priorities?

**Next Steps After Approval:**
1. Create Phase 2 branch: `claude/phase2-angular-migration`
2. Start with Component 1 (Define Opportunities)
3. Deliver incrementally with testing at each stage
4. Merge to main branch when complete

---

## Sources & References

Research findings:
- [CiviCRM Backbone Documentation](https://docs.civicrm.org/dev/en/latest/framework/backbone/) - States Backbone "no longer recommended"
- [CiviCRM 6.9 Release](https://civicrm.org/blog/dev-team/civicrm-69-release)
- Web search confirms Backbone/Marionette deprecated in modern CiviCRM

---

**End of Phase 2 Modernization Plan**
