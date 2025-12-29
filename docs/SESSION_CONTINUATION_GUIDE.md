# CiviVolunteer Modernization - Session Continuation Guide

**Last Updated:** 2025-12-28
**Version:** 2.5.0 (Modernized)
**Branch:** `claude/explore-codebase-structure-PKUon`

## Current Status Summary

### ✅ **Phase 0: COMPLETED**
Removed org.civicrm.angularprofiles dependency successfully.

**Changes Made:**
- Removed `org.civicrm.angularprofiles` from `info.xml` requires section
- Removed `crmProfileUtils` from Angular module dependencies in `ang/volunteer.ang.php`
- Removed all `crmProfiles` service usage in `ang/volunteer.js`
- Removed runtime dependency checks in `CRM/Volunteer/Upgrader.php`
- Replaced profile selector with native CiviCRM `crm-entityref` directive

### ✅ **Phase 1: COMPLETED**
Added conflict detection for preventing double-booking volunteers.

**Changes Made:**
- Created `CRM/Volunteer/BAO/ConflictChecker.php` with overlap detection logic
- Added conflict checking to `api/v3/VolunteerAssignment.php`
- Implements time-based conflict detection for volunteer assignments

### ✅ **UX Improvements: COMPLETED**
- Added required field indicators (*) to Beneficiary, Manager, Owner fields
- Changed "Save and Done" to "Save & Close" button label
- Added tooltip to Continue button
- Fixed error handling to prevent spinning logo from getting stuck

### ⚠️ **Current Blocker: Backbone/Marionette Removed from CiviCRM 6.9.1**

**Discovery:**
- CiviCRM 6.9.1 no longer includes Backbone.js or Marionette.js libraries
- CiviCRM documentation states Backbone is "no longer recommended" and kept for "archival purposes"
- CiviCRM historically bundled old versions: Backbone 0.9.9, Marionette 1.0.0-rc2

**Impact:**
- ✅ **Angular-based features WORK:** Project creation, editing, listing
- ❌ **Backbone-based features BROKEN:** Define Opportunities, Assign Volunteers, Search Opportunities

**Console Error:**
```
Missing required libraries: Backbone.js, Marionette.js
CiviCRM version may not include Backbone/Marionette, or they failed to load.
The Define/Assign/Search volunteer management features require these libraries.
```

---

## Project Structure

### Key Files & Locations

**Extension Metadata:**
- `info.xml` - Extension info, version 2.5.0, compatibility 6.9.1
- `volunteer.php` - Main extension file (hooks)
- `CRM/Volunteer/Upgrader.php` - Installation/upgrade logic

**Angular Application (✅ Working):**
- `ang/volunteer.ang.php` - Angular module definition
- `ang/volunteer.js` - Main Angular controller and volBackbone service
- `ang/volunteer/Project.js` - Project creation/editing controller
- `ang/volunteer/Project.html` - Project form template
- `ang/volunteer/Projects.js` - Project listing controller
- `ang/volunteer/Projects.html` - Project listing template

**Backbone Application (❌ Broken - needs Phase 2):**
- `js/backbone/apps/volunteer_app.js` - Main Backbone/Marionette app
- `js/backbone/apps/define/` - Define Opportunities UI
- `js/backbone/apps/assign/` - Assign Volunteers UI
- `js/backbone/apps/search/` - Search Opportunities UI
- `templates/CRM/Volunteer/Page/Backbone*.tpl` - Backbone templates
- `CRM/Volunteer/Page/Backbone.php` - Backbone page loader

**API Layer:**
- `api/v3/VolunteerProject.php` - Project CRUD operations
- `api/v3/VolunteerNeed.php` - Opportunity CRUD operations
- `api/v3/VolunteerAssignment.php` - Assignment CRUD with conflict detection
- `api/v3/VolunteerUtil.php` - Utility functions including `loadbackbone` API

**Business Logic:**
- `CRM/Volunteer/BAO/Project.php` - Project business logic
- `CRM/Volunteer/BAO/Need.php` - Opportunity business logic
- `CRM/Volunteer/BAO/Assignment.php` - Assignment business logic
- `CRM/Volunteer/BAO/ConflictChecker.php` - **NEW** Conflict detection

---

## Version Information

**Extension Version:** 2.5.0 (Modernized)
**CiviCRM Compatibility:** 6.9.1
**Angular Version:** Provided by CiviCRM core (AngularJS 1.x)
**Dependencies:** None (removed org.civicrm.angularprofiles)

**Framework Usage:**
- **AngularJS 1.x** - Used by CiviCRM core, project management UI
- **Backbone.js + Marionette** - DEPRECATED, needs replacement in Phase 2
- **jQuery** - Provided by CiviCRM core
- **Underscore.js** - Provided by CiviCRM core

---

## Git Information

**Repository:** madgophers/org.civicrm.volunteer
**Current Branch:** `claude/explore-codebase-structure-PKUon`
**Main Branch:** (not specified - likely `master` or `main`)

**Recent Commits:**
```
cf3d7f2 - Improve Backbone/Marionette loading and fix required field indicators
3ceda38 - Fix Backbone/Marionette dependency loading to resolve CRM.BB undefined error
6195dae - Update CiviCRM compatibility to version 6.9.1 and move ZIP to zip folder
179155c - UX improvements and critical volBackbone error handling fixes
ed41518 - Fix Angular dependency injection error - remove crmProfiles from volBackbone
```

**Distribution Package:**
`zip/org.civicrm.volunteer-modernized-v2.5.0.zip` (838KB)

---

## What's Working vs. What's Broken

### ✅ **Working Features (Angular-based):**
1. **Project Management:**
   - Create new volunteer projects
   - Edit existing projects
   - List all projects
   - Filter/search projects
   - Enable/disable projects
   - Delete projects
   - Set project relationships (Beneficiary, Manager, Owner)
   - Configure profiles for volunteer registration
   - Set project location

2. **Integration:**
   - Event integration (volunteer tab on events)
   - Campaign filtering
   - Permission-based access control

### ❌ **Broken Features (Backbone-based - needs Phase 2):**
1. **Define Opportunities:**
   - Create volunteer opportunities/needs
   - Set time slots, roles, quantities
   - Define flexible needs

2. **Assign Volunteers:**
   - Assign volunteers to opportunities
   - View roster
   - Manage assignments

3. **Search Opportunities:**
   - Public-facing opportunity search
   - Volunteer self-signup
   - Search filters

---

## Known Issues

### Issue #1: Backbone/Marionette Missing
**Status:** Root cause identified, needs Phase 2
**Error:** "Missing required libraries: Backbone.js, Marionette.js"
**Files Affected:**
- All files in `js/backbone/` directory
- `CRM/Volunteer/Page/Backbone.php`
- `templates/CRM/Volunteer/Page/Backbone*.tpl`

**Solution:** Phase 2 - Modernize to Angular (see Phase 2 outline below)

### Issue #2: Required Field Indicators
**Status:** FIXED (commit cf3d7f2)
**Solution:** Used `ng-required` directive on input elements

---

## How to Resume Work

### If Starting a New Session:

1. **Read this document** to understand current state
2. **Read `MODERNIZATION_PLAN.md`** for the overall strategy
3. **Read `docs/phase0-remove-angularprofiles.md`** for Phase 0 details
4. **Check the branch:**
   ```bash
   git status
   git log --oneline -10
   ```

5. **Review the console output** from the user to understand current errors

6. **Decision Point:**
   - If continuing bug fixes → Work on current issues
   - If ready for Phase 2 → Start Backbone → Angular migration

### Testing the Current Build:

1. **Install extension:**
   - Use `zip/org.civicrm.volunteer-modernized-v2.5.0.zip`
   - Install via CiviCRM Extensions UI

2. **Test working features:**
   - Navigate to Volunteers > Manage Projects
   - Create a new project
   - Verify required field indicators show
   - Verify Save & Close button works

3. **Confirm broken features:**
   - Click "Continue" after saving project
   - Should show error: "Failed to load the Define Opportunities interface"
   - Console shows: "Missing required libraries: Backbone.js, Marionette.js"

---

## Next Steps (Phase 2 Required)

See `docs/PHASE2_MODERNIZATION_PLAN.md` for detailed outline.

**Summary:** Replace Backbone/Marionette-based UI components with Angular:
- Migrate Define Opportunities UI to Angular
- Migrate Assign Volunteers UI to Angular
- Migrate Search Opportunities UI to Angular

**Estimated Effort:** Medium-Large (3 major UI components to rebuild)

**Benefits:**
- Full compatibility with CiviCRM 6.9.1+
- Consistent Angular-based architecture
- Better maintainability
- Modern development practices

---

## Documentation Files

- `MODERNIZATION_PLAN.md` - Overall modernization strategy
- `docs/phase0-remove-angularprofiles.md` - Phase 0 implementation details
- `docs/SESSION_CONTINUATION_GUIDE.md` - **This file** - Session continuation guide
- `docs/PHASE2_MODERNIZATION_PLAN.md` - Phase 2 detailed plan (to be created)
- `docs/INSTALLATION.md` - Installation instructions
- `README.md` - Project overview

---

## Important Considerations

### Backward Compatibility:
- Version 2.5.0 is NOT compatible with installations that still have legacy Backbone-based volunteer opportunity management
- Angular-based project management works independently
- Users can create projects but cannot define opportunities until Phase 2 is complete

### Data Integrity:
- All database changes are backward compatible
- No data migration required
- Existing volunteer opportunities and assignments remain intact in database
- UI to manage them is what's broken

### User Communication:
- Users should be informed that Define/Assign/Search features are temporarily unavailable
- Project creation/management is fully functional
- Phase 2 will restore full functionality with modern Angular implementation

---

## Sources & References

- [CiviCRM Backbone Reference](https://docs.civicrm.org/dev/en/latest/framework/backbone/) - States Backbone is "no longer recommended"
- [CiviCRM 6.9 Release Blog](https://civicrm.org/blog/dev-team/civicrm-69-release)
- [CiviCRM Marionette Compatibility Issue](https://lab.civicrm.org/dev/core/-/issues/1090)
- Web search results confirm Backbone/Marionette deprecated in modern CiviCRM

---

**End of Session Continuation Guide**
