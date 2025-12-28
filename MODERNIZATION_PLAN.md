# CiviVolunteer Modernization Plan
## Hybrid Approach: CiviVolunteer Backend + MyShift UI

**Last Updated:** 2025-12-28
**Session ID:** claude/explore-codebase-structure-PKUon
**Branch:** claude/explore-codebase-structure-PKUon

---

## Project Goal

Create a modernized version of CiviVolunteer by:
- ✅ Keeping CiviVolunteer's backend (CiviCRM integration, database schema, API)
- ✅ Replacing the frontend with modern UI components inspired by MyShift/Easy!Appointments
- ✅ Adding advanced scheduling features from MyShift (working hours, unavailabilities, FullCalendar)
- ✅ Maintaining backward compatibility with CiviCRM
- ✅ Contributing improvements back to upstream CiviVolunteer

---

## Why This Approach?

### CiviVolunteer Strengths (KEEP)
- Native CiviCRM integration (volunteers as contacts, shifts as activities)
- Hours tracking, commendations, project relationships
- CiviReport integration, permissions system
- Existing production usage

### MyShift Strengths (ADOPT)
- FullCalendar 6 (modern calendar UI)
- Working hours/unavailabilities (advanced scheduling)
- Multi-step booking wizard (better UX)
- Bootstrap 5, modern responsive design
- Availability calculation logic

### What We're Doing
Extracting UI components and scheduling logic from MyShift, integrating into CiviVolunteer's proven backend.

---

## Technical Architecture

### Components from MyShift (/home/user/myshift)

**Files to extract/adapt:**

1. **Calendar UI**
   - Source: `/home/user/myshift/assets/js/pages/calendar.js`
   - Target: `/home/user/org.civicrm.volunteer/js/modern-ui/calendar-integration.js`
   - Uses: FullCalendar 6 configuration, drag-drop, event rendering

2. **Booking Wizard**
   - Source: `/home/user/myshift/assets/js/pages/booking.js`
   - Target: `/home/user/org.civicrm.volunteer/js/modern-ui/booking-wizard.js`
   - Features: Multi-step form, real-time availability

3. **Availability Logic**
   - Source: `/home/user/myshift/application/libraries/Availability.php` (24KB, 600+ lines)
   - Target: `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/Availability.php`
   - Logic: Calculate available slots from working plan, unavailabilities, blocked periods

4. **Working Hours Data Model**
   - Source: MyShift `ea_user_settings.working_plan` (TEXT/JSON field)
   - Format: `{"monday": {"start":"09:00", "end":"17:00", "breaks":[...]}}`
   - Target: Add to `civicrm_contact` or custom volunteer settings table

5. **Unavailabilities**
   - Source: MyShift `ea_appointments.is_unavailability` flag
   - Target: New table `civicrm_volunteer_unavailability` OR flag in activities

6. **Blocked Periods**
   - Source: MyShift has `ea_blocked_periods` table
   - Target: New table `civicrm_volunteer_blocked_period`

### Components from CiviVolunteer (KEEP AS-IS)

**DO NOT MODIFY:**
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/Assignment.php` - Assignments as activities
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/Project.php` - Projects
- `/home/user/org.civicrm.volunteer/api/v3/Volunteer*.php` - All API endpoints
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/Hook.php` - CiviCRM hooks
- Database schema extensions for CiviCRM

**ENHANCE (but keep backward compatible):**
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/Need.php` - Add availability checking
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/NeedSearch.php` - Use new availability logic

---

## Implementation Phases

### PHASE 1: Database Enhancements (Week 1)
**Goal:** Add working hours, unavailabilities, blocked periods to CiviVolunteer

**Tasks:**
1. Create migration in `/home/user/org.civicrm.volunteer/CRM/Volunteer/Upgrader.php`
2. Add tables/fields:
   - `civicrm_volunteer_unavailability` (contact_id, start_datetime, end_datetime, notes)
   - `civicrm_volunteer_blocked_period` (start_date, end_date, name, notes)
   - Add `working_plan` to volunteer contact custom data OR separate table
3. Create BAO classes:
   - `CRM/Volunteer/BAO/Availability.php` (port from MyShift)
   - `CRM/Volunteer/BAO/Unavailability.php`
   - `CRM/Volunteer/BAO/BlockedPeriod.php`
4. Create API endpoints:
   - `api/v3/VolunteerUnavailability.php`
   - `api/v3/VolunteerBlockedPeriod.php`
   - `api/v3/VolunteerWorkingPlan.php`

**Testing:** Ensure CiviCRM integration still works, no breaking changes

---

### PHASE 2: FullCalendar Integration (Week 2)
**Goal:** Replace Backbone.js calendar with FullCalendar 6

**Tasks:**
1. Add dependencies to `info.xml`:
   - FullCalendar 6.1.11
   - Moment.js 2.30.1
2. Create `/home/user/org.civicrm.volunteer/js/modern-ui/calendar-integration.js`
   - Copy calendar config from MyShift
   - Connect to CiviVolunteer API (NOT MyShift API)
   - Event source: `CRM.api3('VolunteerNeed', 'get')`
   - Drop handler: `CRM.api3('VolunteerAssignment', 'create')`
3. Replace `/home/user/org.civicrm.volunteer/js/backbone/apps/assign/assign_views.js` with new calendar
4. Update templates to load FullCalendar

**Testing:** Admin can view/assign volunteers via new calendar UI

---

### PHASE 3: Public Sign-Up Wizard (Week 3)
**Goal:** Modernize volunteer sign-up with multi-step wizard

**Tasks:**
1. Create `/home/user/org.civicrm.volunteer/js/modern-ui/booking-wizard.js`
   - Adapt MyShift's wizard logic
   - Step 1: Select shift (calendar view)
   - Step 2: Contact info (keep CiviCRM profile)
   - Step 3: Confirm
2. Update `/home/user/org.civicrm.volunteer/templates/CRM/Volunteer/Form/VolunteerSignUp.tpl`
3. Add Flatpickr for date/time selection
4. Real-time availability checking via AJAX

**Testing:** Public can sign up for shifts using new wizard

---

### PHASE 4: Working Hours UI (Week 4)
**Goal:** Allow volunteers to set their availability

**Tasks:**
1. Create working hours editor component (from MyShift)
2. Add to volunteer profile/settings page
3. Add unavailability management UI
4. Admin can set blocked periods

**Testing:** Volunteers can set weekly schedule, mark time off

---

### PHASE 5: Enhanced Availability Logic (Week 5)
**Goal:** Use working hours in scheduling

**Tasks:**
1. Update `NeedSearch.php` to check availability before showing opportunities
2. Only show shifts that fit volunteer's working plan
3. Respect unavailabilities when assigning
4. Check blocked periods

**Testing:** Volunteers only see/get assigned to shifts during their available hours

---

### PHASE 6: Polish & Testing (Week 6)
**Goal:** Bug fixes, documentation, prepare for production

**Tasks:**
1. PHPUnit tests for new features
2. Update documentation
3. Add attribution to MyShift/Easy!Appointments
4. Performance optimization
5. Accessibility review

---

## Licensing & Attribution

**Extension License:** AGPL-3.0 (same as CiviVolunteer)

**In `info.xml`:**
```xml
<comments>
  Based on CiviVolunteer by Ginkgo Street Labs (AGPL-3.0).
  Calendar UI and scheduling logic inspired by Easy!Appointments (GPL-3.0).

  Original: https://github.com/civicrm/org.civicrm.volunteer
  MyShift: https://github.com/madgophers/myshift
  Easy!Appointments: https://github.com/alextselegidis/easyappointments
</comments>
```

**In README.md:** Credit both projects clearly

---

## Contributing Back to Upstream

**Strategy:** Small, incremental PRs after our fork is stable

**Potential PRs:**
1. "Add FullCalendar 6 support" (UI improvement)
2. "Add working hours and unavailabilities" (new feature)
3. "Modernize public sign-up form" (UX improvement)

**Reference:** Issue #573 (Angular updates todo list) shows they're aware of tech debt

---

## File Paths Quick Reference

### MyShift (Source)
- Calendar: `/home/user/myshift/assets/js/pages/calendar.js`
- Booking: `/home/user/myshift/assets/js/pages/booking.js`
- Availability: `/home/user/myshift/application/libraries/Availability.php`
- Database: `/home/user/myshift/application/migrations/001_specific_calendar_sync.php`

### CiviVolunteer (Target)
- Upgrader: `/home/user/org.civicrm.volunteer/CRM/Volunteer/Upgrader.php`
- BAO: `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/`
- API: `/home/user/org.civicrm.volunteer/api/v3/`
- New JS: `/home/user/org.civicrm.volunteer/js/modern-ui/` (create this)
- Templates: `/home/user/org.civicrm.volunteer/templates/`

---

## Current Status

- ✅ Analyzed both codebases
- ✅ Created implementation plan
- ✅ Identified components to extract
- ⏳ Ready to begin Phase 1 (database enhancements)

---

## Next Session Prompt

**To continue this work in a new Claude Code session, use this prompt:**

```
I'm working on modernizing the CiviVolunteer extension by integrating
UI components from MyShift (Easy!Appointments fork).

Please read /home/user/org.civicrm.volunteer/MODERNIZATION_PLAN.md
for the full plan.

Key context:
- CiviVolunteer: /home/user/org.civicrm.volunteer (CiviCRM extension)
- MyShift: /home/user/myshift (Easy!Appointments fork)
- Branch: claude/explore-codebase-structure-PKUon
- Goal: Keep CiviVolunteer backend, modernize with MyShift UI

I'm currently on [PHASE X]. Please help me implement [specific task].
```

---

## Key Decisions Made

1. ✅ Use fork approach (madgophers/org.civicrm.volunteer)
2. ✅ Keep CiviVolunteer backend (don't rebuild CiviCRM integration)
3. ✅ Extract UI components from MyShift (don't integrate whole system)
4. ✅ Add working hours/availability features (from MyShift)
5. ✅ Maintain backward compatibility with CiviCRM
6. ✅ Contribute back to upstream when stable

---

## Resources

- CiviVolunteer Docs: https://docs.civicrm.org/volunteer/en/latest/
- CiviVolunteer Issues: https://github.com/civicrm/org.civicrm.volunteer/issues
- Easy!Appointments Docs: https://easyappointments.org/docs/
- FullCalendar Docs: https://fullcalendar.io/docs
