# CiviVolunteer Modernization Plan
## Hybrid Approach: CiviVolunteer Backend + MyShift UI

**Last Updated:** 2025-12-28 (REVISED)
**Session ID:** claude/explore-codebase-structure-PKUon
**Branch:** claude/explore-codebase-structure-PKUon

---

## Understanding CiviVolunteer's Use Case

**IMPORTANT:** CiviVolunteer follows a **"volunteers are customers"** model, NOT a "volunteers are providers" model.

### How It Works:
1. **Staff creates opportunities** with fixed times
   - Example: "Gate duty, Dec 1, 9 AM-12 PM, need 5 volunteers"
2. **Volunteers browse and self-select** shifts that fit their personal schedule
   - Example: Volunteer sees the Dec 1 shift and signs up
3. **OR: Staff manually assigns** volunteers to opportunities (drag-drop)
4. **System prevents overbooking** opportunities (won't allow 6th volunteer when only 5 needed)

### Key Insight:
- ✅ Opportunities have **fixed, pre-defined times** (like products)
- ✅ Volunteers **choose** what fits their schedule (like shopping)
- ❌ Volunteers do NOT set "working hours" like service providers
- ❌ Opportunities are NOT scheduled around volunteer availability

### Current Problem (from docs):
> "⚠️ When you assign a contact to an opportunity, CiviVolunteer does **not check whether the contact is already assigned** to a different opportunity, overlapping in time. You will have to take this logic into account to avoid double-booking volunteers."

**This is what we need to fix!**

---

## Project Goal (REVISED)

Create a modernized version of CiviVolunteer by:
- ✅ Keeping CiviVolunteer's backend (CiviCRM integration, database schema, API)
- ✅ Replacing the frontend with modern UI components inspired by MyShift/Easy!Appointments
- ✅ **Adding conflict detection** to prevent double-booking volunteers
- ✅ Improving the volunteer sign-up experience with better calendar views
- ✅ Maintaining backward compatibility with CiviCRM
- ✅ Contributing improvements back to upstream CiviVolunteer

---

## Why This Approach?

### CiviVolunteer Strengths (KEEP)
- Native CiviCRM integration (volunteers as contacts, shifts as activities)
- Hours tracking, commendations, project relationships
- CiviReport integration, permissions system
- Existing production usage
- Self-service sign-up with overbooking prevention

### MyShift Strengths (ADOPT)
- ✅ **FullCalendar 6** - Modern calendar UI for browsing opportunities
- ✅ **Multi-step booking wizard** - Better UX for volunteer sign-up
- ✅ **Bootstrap 5** - Modern, responsive design
- ✅ **Conflict detection logic** - Prevent double-booking (adapted from availability checking)
- ✅ **Better date/time pickers** - Flatpickr for modern UI

### What We're NOT Doing
- ❌ Working hours/working plan (volunteers aren't providers with set schedules)
- ❌ Unavailabilities (volunteers self-select shifts that fit their personal schedule)
- ❌ Blocked periods (can be added later if needed)

### What We're Doing
Extracting UI components from MyShift and adding conflict detection to CiviVolunteer's proven backend.

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
   - Features: Multi-step form, real-time availability (slots remaining)

3. **Conflict Detection Logic** (NEW - PRIORITY)
   - Source: `/home/user/myshift/application/libraries/Availability.php` (adapted)
   - Target: `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/ConflictChecker.php`
   - Logic: Check if volunteer is already assigned to overlapping opportunity
   - **Key function:** `hasConflict($contact_id, $start_time, $end_time)`

4. **UI Components**
   - Flatpickr date/time pickers
   - Bootstrap 5 layouts (or adapt to Bootstrap 3 if CiviCRM uses it)
   - Modern responsive forms

### Components from CiviVolunteer (KEEP AS-IS)

**DO NOT MODIFY:**
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/Assignment.php` - Assignments as activities
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/Project.php` - Projects
- `/home/user/org.civicrm.volunteer/api/v3/Volunteer*.php` - All API endpoints
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/Hook.php` - CiviCRM hooks
- Database schema extensions for CiviCRM

**ENHANCE (but keep backward compatible):**
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/Need.php` - Add availability checking (slots remaining)
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/Assignment.php` - Add conflict detection before creating assignment
- `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/NeedSearch.php` - Improve search performance

---

## Implementation Phases (REVISED)

### PHASE 1: Conflict Detection (Week 1) ⭐ HIGH PRIORITY
**Goal:** Prevent double-booking volunteers in overlapping shifts

**Tasks:**
1. Create `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/ConflictChecker.php`
   - Method: `checkConflict($contact_id, $need_id)`
   - Logic: Query existing assignments for contact, check time overlap with new need
   - Return: Boolean + conflict details (what shift they're already assigned to)

2. Enhance `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/Assignment.php`
   - Before creating assignment, call `ConflictChecker::checkConflict()`
   - If conflict exists, throw exception with clear error message
   - Add `force` parameter to override conflicts if admin wants to

3. Update API endpoint `/home/user/org.civicrm.volunteer/api/v3/VolunteerAssignment.php`
   - Call conflict checker in `create` method
   - Return error with conflict details if detected

4. Add visual indicator in admin UI
   - When searching for volunteers to assign, show "Available" or "Conflict: Already assigned to [shift name]"

**Testing:**
- Assign volunteer to shift A (9-11 AM)
- Try to assign same volunteer to shift B (10 AM-12 PM)
- System should prevent assignment and show error

---

### PHASE 2: FullCalendar Integration (Week 2) ⭐ HIGH PRIORITY
**Goal:** Replace Backbone.js calendar with FullCalendar 6

**Tasks:**
1. Add dependencies to `info.xml` or include directly:
   - FullCalendar 6.1.11
   - Moment.js 2.30.1 (or use native Date if FullCalendar supports it)

2. Create `/home/user/org.civicrm.volunteer/js/modern-ui/calendar-integration.js`
   - Copy calendar config from MyShift
   - Connect to CiviVolunteer API (NOT MyShift API)
   - Event source: `CRM.api3('VolunteerNeed', 'get')`
   - Drop handler: `CRM.api3('VolunteerAssignment', 'create')` with conflict checking
   - Show error popup if conflict detected

3. Create admin calendar page
   - Replace `/home/user/org.civicrm.volunteer/js/backbone/apps/assign/assign_views.js`
   - New template using FullCalendar
   - Color-code opportunities by status (open, partially filled, fully booked)
   - Show assignments on calendar (volunteer names in events)

4. Create public opportunity browser
   - Calendar view for volunteers to see available shifts
   - Filter by role, date range, project
   - Click event to sign up

**Testing:**
- Admin can view all opportunities in calendar
- Admin can drag volunteers to assign (with conflict detection)
- Public can browse opportunities in calendar view

---

### PHASE 3: Multi-Step Sign-Up Wizard (Week 3) ⭐ HIGH PRIORITY
**Goal:** Modernize volunteer sign-up with better UX

**Tasks:**
1. Create `/home/user/org.civicrm.volunteer/js/modern-ui/booking-wizard.js`
   - Step 1: Browse opportunities (calendar or list view)
   - Step 2: Select opportunity (show details, slots remaining)
   - Step 3: Contact info (keep CiviCRM profile integration)
   - Step 4: Review and confirm
   - Progress indicator showing current step

2. Update `/home/user/org.civicrm.volunteer/templates/CRM/Volunteer/Form/VolunteerSignUp.tpl`
   - Multi-step layout inspired by MyShift
   - Keep existing CiviCRM profile functionality
   - Add "Back" buttons between steps

3. Add real-time availability
   - AJAX call to check slots remaining as volunteers browse
   - Show "X of Y spots remaining"
   - Disable opportunities that are fully booked

4. Improve mobile responsiveness
   - Bootstrap responsive grid
   - Touch-friendly calendar navigation
   - Mobile-optimized forms

**Testing:**
- Volunteer can browse opportunities in calendar
- Volunteer can sign up through multi-step wizard
- Shows accurate slot availability
- Works well on mobile devices

---

### PHASE 4: Search & Filtering Improvements (Week 4)
**Goal:** Better search for both volunteers and staff

**Tasks:**
1. Enhance opportunity search for volunteers
   - Filter by: date range, role, project, location
   - Search by keyword in opportunity description
   - Sort by: date, slots remaining, role

2. Enhance volunteer search for staff (assignment UI)
   - Keep existing skill-based search
   - Add conflict indicator (show if volunteer has overlapping assignments)
   - Show volunteer's recent assignment history

3. Modernize search UI
   - Replace AngularJS search with modern framework or vanilla JS
   - Better filters and faceted search
   - Show search results count

**Testing:**
- Volunteers can easily find opportunities matching their preferences
- Staff can search for available (non-conflicting) volunteers
- Filters work correctly

---

### PHASE 5: UI Polish & Responsive Design (Week 5)
**Goal:** Modern, accessible, mobile-friendly interface

**Tasks:**
1. Apply consistent styling
   - Bootstrap theme or custom CSS
   - Consistent buttons, forms, typography
   - Accessible color contrast

2. Improve date/time pickers
   - Replace existing pickers with Flatpickr
   - Timezone-aware if needed
   - Clear formatting (12h vs 24h based on locale)

3. Add loading states and better error messages
   - Spinners during AJAX calls
   - Clear error messages (not technical jargon)
   - Success confirmations

4. Accessibility improvements
   - ARIA labels for screen readers
   - Keyboard navigation
   - Focus management in modals

**Testing:**
- UI looks modern and professional
- Works well on mobile, tablet, desktop
- Passes basic accessibility checks (WCAG AA)

---

### PHASE 6: Testing, Documentation & Polish (Week 6)
**Goal:** Production-ready code

**Tasks:**
1. PHPUnit tests for new features
   - Test conflict detection logic
   - Test API endpoints
   - Test BAO methods

2. Update documentation
   - Add conflict detection to docs
   - Update screenshots with new UI
   - Add attribution to MyShift/Easy!Appointments

3. Performance optimization
   - Optimize database queries (add indexes if needed)
   - Lazy-load calendar events
   - Cache API responses where appropriate

4. Security review
   - Ensure API calls check permissions
   - Validate all inputs
   - Test XSS/CSRF protection

**Testing:**
- All features work as expected
- No breaking changes to existing functionality
- Performance is acceptable
- Security best practices followed

---

## Optional Future Features

**Consider adding these in future phases if users request them:**

### Volunteer Preferences (Not Working Hours)
- Allow volunteers to set preferences like:
  - "I prefer weekday evenings"
  - "I prefer outdoor activities"
  - "I can only volunteer on weekends"
- Use preferences to **filter** opportunities shown to volunteer (show best matches first)
- **NOT** blocking specific times like a provider schedule
- **NOT** required - volunteers can already just browse and pick what they want

### Recurring Opportunities
- Create recurring shifts (e.g., "Gate duty every Saturday for 3 months")
- Generate multiple shift instances at once
- Allow volunteers to sign up for series or individual shifts

### Advanced Skill Matching
- Enhanced skill/certification tracking
- Auto-suggest volunteers based on required skills
- Training/certification expiry tracking

### Shift Swapping
- Allow volunteers to trade shifts with each other
- Requires approval workflow
- Send notifications to both volunteers

### Volunteer Recognition Enhancements
- Badges/gamification
- Leaderboards (hours volunteered)
- Automated milestone emails (50 hours, 100 hours, etc.)

### Mobile App
- Native mobile app for volunteers
- Push notifications for shift reminders
- Quick sign-in/out at events

### Analytics Dashboard
- Volunteer participation trends
- Popular vs unpopular opportunities
- Volunteer retention metrics

---

## Licensing & Attribution

**Extension License:** AGPL-3.0 (same as CiviVolunteer)

**In `info.xml`:**
```xml
<comments>
  Based on CiviVolunteer by Ginkgo Street Labs (AGPL-3.0).
  Calendar UI components inspired by Easy!Appointments (GPL-3.0).

  Original CiviVolunteer: https://github.com/civicrm/org.civicrm.volunteer
  MyShift (Easy!Appointments fork): https://github.com/madgophers/myshift
  Easy!Appointments: https://github.com/alextselegidis/easyappointments
</comments>
```

**In README.md:**
```markdown
## Credits

- **Original CiviVolunteer**: Ginkgo Street Labs (AGPL-3.0)
- **UI Inspiration**: Easy!Appointments by Alex Tselegidis (GPL-3.0)
- **Modern Enhancements**: madgophers team

## Differences from Upstream

- ✅ Conflict detection to prevent double-booking volunteers
- ✅ FullCalendar 6 for modern calendar views
- ✅ Multi-step sign-up wizard for better volunteer UX
- ✅ Improved search and filtering
- ✅ Modern responsive design with Bootstrap 5
- ✅ All original CiviCRM integration preserved
```

---

## Contributing Back to Upstream

**Strategy:** Small, incremental PRs after our fork is stable

**Potential PRs:**
1. "Add conflict detection to prevent double-booking volunteers" (bug fix/enhancement)
2. "Add FullCalendar 6 support for calendar views" (UI improvement)
3. "Modernize public sign-up form with multi-step wizard" (UX improvement)
4. "Improve search and filtering UI" (enhancement)

**Reference:** Issue #573 (Angular updates todo list) shows they're aware of tech debt

**Approach:**
1. Build and test features on our fork first
2. Engage with maintainers via GitHub issues
3. Create small, focused PRs (easier to review)
4. Be patient - they may have different priorities
5. If they don't merge, our fork still works perfectly

---

## File Paths Quick Reference

### MyShift (Source - for UI inspiration)
- Calendar: `/home/user/myshift/assets/js/pages/calendar.js`
- Booking: `/home/user/myshift/assets/js/pages/booking.js`
- Availability (for conflict logic): `/home/user/myshift/application/libraries/Availability.php`
- Database: `/home/user/myshift/application/migrations/001_specific_calendar_sync.php`

### CiviVolunteer (Target - our implementation)
- **New files:**
  - `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/ConflictChecker.php` (Phase 1)
  - `/home/user/org.civicrm.volunteer/js/modern-ui/calendar-integration.js` (Phase 2)
  - `/home/user/org.civicrm.volunteer/js/modern-ui/booking-wizard.js` (Phase 3)
  - `/home/user/org.civicrm.volunteer/css/modern-ui/` (Phase 5)

- **Existing files to enhance:**
  - Upgrader: `/home/user/org.civicrm.volunteer/CRM/Volunteer/Upgrader.php`
  - BAO: `/home/user/org.civicrm.volunteer/CRM/Volunteer/BAO/`
  - API: `/home/user/org.civicrm.volunteer/api/v3/`
  - Templates: `/home/user/org.civicrm.volunteer/templates/`

---

## Current Status

- ✅ Analyzed both codebases
- ✅ **REVISED implementation plan** based on correct understanding of use case
- ✅ Identified that volunteers are "customers" not "providers"
- ✅ Prioritized conflict detection as critical feature
- ✅ Moved working hours/unavailabilities to optional future features
- ⏳ Ready to begin Phase 1 (conflict detection)

---

## Next Session Prompt

**To continue this work in a new Claude Code session, use this prompt:**

```
I'm modernizing CiviVolunteer by adding MyShift-inspired UI components.

Please read /home/user/org.civicrm.volunteer/MODERNIZATION_PLAN.md
for the full plan.

Key context:
- CiviVolunteer: /home/user/org.civicrm.volunteer (CiviCRM extension)
- MyShift: /home/user/myshift (Easy!Appointments fork - UI inspiration only)
- Branch: claude/explore-codebase-structure-PKUon
- Use Case: Volunteers are "customers" booking pre-defined shifts (NOT providers with working hours)

Current priorities:
1. Conflict detection (prevent double-booking)
2. FullCalendar UI
3. Multi-step sign-up wizard

I'm currently on [PHASE X]. Please help me implement [specific task].
```

---

## Key Decisions Made (REVISED)

1. ✅ Use fork approach (madgophers/org.civicrm.volunteer)
2. ✅ Keep CiviVolunteer backend (don't rebuild CiviCRM integration)
3. ✅ Extract UI components from MyShift (don't integrate whole system)
4. ✅ **REVISED:** Focus on conflict detection, modern UI, better sign-up UX
5. ✅ **REVISED:** Skip working hours/unavailabilities (volunteers aren't providers)
6. ✅ **REVISED:** Move volunteer preferences to optional future features
7. ✅ Maintain backward compatibility with CiviCRM
8. ✅ Contribute back to upstream when stable

---

## Critical Insights from Analysis

### What We Learned:
1. **CiviVolunteer Use Case:** Volunteers self-select from pre-defined opportunities with fixed times
2. **Current Pain Point:** No conflict detection - coordinators can accidentally double-book volunteers
3. **MyShift Features to Adopt:** UI/UX improvements, NOT working hours logic
4. **Priority Order:** Fix double-booking bug > Modernize UI > Nice-to-have features

### What Changed from Original Plan:
- ❌ Removed: Working hours, unavailabilities, blocked periods from core phases
- ✅ Added: Conflict detection as Phase 1 priority
- ✅ Simplified: Focus on UI modernization without unnecessary scheduling complexity
- ✅ Clarified: Volunteer preferences as optional future feature (not working hours)

---

## Resources

- CiviVolunteer Docs: https://docs.civicrm.org/volunteer/en/latest/
- CiviVolunteer Issues: https://github.com/civicrm/org.civicrm.volunteer/issues
- Easy!Appointments Docs: https://easyappointments.org/docs/
- FullCalendar Docs: https://fullcalendar.io/docs
- Bootstrap 5 Docs: https://getbootstrap.com/docs/5.3/
