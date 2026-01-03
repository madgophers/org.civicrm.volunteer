# Phase 3: Volunteer Assignment UX Redesign

## Current State Analysis

### What "Available Volunteers" Actually Is

**Database Schema:**
- `civicrm_volunteer_need` table has `is_flexible` field (tinyint)
- When `is_flexible = 1`: "Indicates that the volunteer is generally available" (no specific time/role)
- When `is_flexible = 0`: Scheduled shift with specific time/role/quantity

**How It Works:**
1. Volunteers can sign up via public page for:
   - Specific scheduled shifts → Status: "Scheduled"
   - Flexible/general availability → Status: "Available"
2. **ALL signups create/update contacts** via `CRM_Contact_BAO_Contact::createProfileContact()`
   - Deduplication runs automatically
   - Contacts ARE added to the database
3. Admin can manually assign volunteers via "Add Volunteer" dropdown

**Current UX Problems:**
1. "Available Volunteers" section always visible even when empty
2. Move/Copy/Delete menu missing CSS - displays as ugly expanded list
3. No way to filter volunteers by availability
4. Doesn't scale with 1000s of volunteers
5. Public signup works but UX needs improvement (future phase)

---

## Phase 3 Goals (Short-term Fixes)

### Priority 1: Fix Critical UX Issues
- [ ] Add CSS for action menu (make it a proper dropdown)
- [x] Prevent duplicate assignments (DONE in 2.6.1)
- [x] Improve dropdown display format (DONE in 2.6.1)
- [ ] Hide "Available Volunteers" section when empty
- [ ] Add proper icons/buttons instead of text menus

### Priority 2: Simplify Assignment Workflow (Option A)
**Remove confusion by implementing direct assignment:**

**Current Broken Flow:**
```
1. Admin adds volunteer to "Available Volunteers" pool
2. Volunteer sits in limbo
3. Admin must remember to Move/Copy to actual shift
4. Error-prone, confusing
```

**New Simplified Flow:**
```
Scheduled Shift Section:
  Ticket-taker (01/10/2026 9:12 PM) - Need 3
    Currently Assigned (1):
      ✓ john doe [x remove]

    [🔍 Search & Assign More Volunteers]

  When clicked → Opens existing search modal
                → Select volunteer(s)
                → Immediately assigned to THIS shift
                → Modal closes
```

**Benefits:**
- No intermediate "Available" pool needed
- Clear assignment to specific shifts
- Existing search modal works perfectly
- Conflict detection already implemented

---

## Phase 4 Goals (Availability Tracking & Calendar UI)

### Database Schema Additions

**New Table: `civicrm_volunteer_availability`**
```sql
CREATE TABLE `civicrm_volunteer_availability` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `contact_id` int unsigned NOT NULL COMMENT 'FK to civicrm_contact',
  `day_of_week` tinyint COMMENT '0=Sunday, 1=Monday, ... 6=Saturday',
  `start_time` time COMMENT 'Start time for this availability slot',
  `end_time` time COMMENT 'End time for this availability slot',
  `start_date` date COMMENT 'Optional: availability starts on this date',
  `end_date` date COMMENT 'Optional: availability ends on this date',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created` timestamp DEFAULT CURRENT_TIMESTAMP,
  `last_updated` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT FK_civicrm_volunteer_availability_contact_id
    FOREIGN KEY (`contact_id`) REFERENCES `civicrm_contact`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_contact_id ON civicrm_volunteer_availability (contact_id);
CREATE INDEX idx_day_of_week ON civicrm_volunteer_availability (day_of_week);
```

**New Table: `civicrm_volunteer_blackout`**
```sql
CREATE TABLE `civicrm_volunteer_blackout` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `contact_id` int unsigned NOT NULL COMMENT 'FK to civicrm_contact',
  `start_datetime` datetime NOT NULL COMMENT 'Start of unavailable period',
  `end_datetime` datetime NOT NULL COMMENT 'End of unavailable period',
  `reason` varchar(255) COMMENT 'Optional reason for blackout',
  `created` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT FK_civicrm_volunteer_blackout_contact_id
    FOREIGN KEY (`contact_id`) REFERENCES `civicrm_contact`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_blackout_contact ON civicrm_volunteer_blackout (contact_id);
CREATE INDEX idx_blackout_dates ON civicrm_volunteer_blackout (start_datetime, end_datetime);
```

### Features

**1. Availability Capture on Public Signup**
- Volunteers can select:
  - Days/times they're generally available
  - Specific date ranges they cannot volunteer (vacations, etc.)
- Stored in new tables

**2. Smart Filtering in Admin Assignment**
- When assigning to a shift at specific date/time:
  - Only show volunteers who:
    - Are available that day/time (recurring availability)
    - Don't have a blackout during that period
    - Aren't already assigned to a conflicting shift
  - Grayed out volunteers with reason: "Not available Tuesdays" or "On vacation"

**3. Calendar/Schedule UI (Option C - Long-term)**

**Reference: MyShift / Easy Appointments Style**
```
┌─────────────────────────────────────────────────────────┐
│  Week of Jan 6-12, 2026                    [< Today >]  │
├─────────────────────────────────────────────────────────┤
│         Mon 1/6    Tue 1/7    Wed 1/8    Thu 1/9  ...  │
│         ─────────  ─────────  ─────────  ─────────      │
│ 9:00 AM │ Need 2 │          │ Need 3 │          │      │
│ Ticket- │ ✓John  │          │ ✓Jane  │          │      │
│ taker   │ ✓Mary  │          │ ⚠Empty │          │      │
│         │ [+Add] │          │ [+Add] │          │      │
│         ─────────  ─────────  ─────────  ─────────      │
│ 2:00 PM          │ Need 1  │          │ Need 2  │      │
│ Greeter          │ ⚠Empty  │          │ ✓Bob    │      │
│                  │ [+Add]  │          │ ⚠Empty  │      │
└─────────────────────────────────────────────────────────┘

Click [+Add] or drag volunteers from sidebar:
┌──────────────────┐
│ Available        │
│ ☑ Filter by:     │
│   availability   │
│ ────────────────│
│ 🟢 Susan (avail) │
│ 🔴 Tom (busy)    │
│ 🟡 Lisa (partial)│
└──────────────────┘
```

**Implementation Options:**
- **Option 1:** Build custom Angular component
- **Option 2:** Integrate FullCalendar JS library (already used in CiviCRM Events)
- **Option 3:** Evaluate MyShift / Easy Appointments compatibility

---

## Recommended Implementation Plan

### Phase 3 (Immediate - v2.7.0)
**Goal:** Fix broken UX, simplify workflow

**Week 1:**
1. Add CSS for action menu dropdown
2. Hide "Available Volunteers" when empty
3. Add "Search & Assign" button to each shift
4. Remove confusing Move/Copy menus (keep Delete only)

**Week 2:**
5. Test assignment workflow thoroughly
6. User acceptance testing
7. Documentation updates

**Deliverables:**
- Working action menus
- Simplified direct assignment
- No more "Available Volunteers" confusion
- Version 2.7.0 released

### Phase 4 (Future - v2.8.0+)
**Goal:** Add availability tracking & modern calendar UI

**Research Phase (2-4 weeks):**
1. Analyze MyShift / Easy Appointments architecture
2. Evaluate FullCalendar integration feasibility
3. Design database schema (above)
4. Design API endpoints for availability
5. Create detailed UX mockups
6. User feedback on mockups

**Implementation Phase (4-8 weeks):**
1. Database schema migration
2. Backend API for availability CRUD
3. Public signup page: add availability selection
4. Admin: filter volunteers by availability
5. Calendar UI component (if pursuing Option C)
6. Testing and refinement

---

## Questions for Discussion

1. **Phase 3 Scope:** Should we keep "Available Volunteers" section entirely or remove it?
   - Keep but hide when empty?
   - Remove and only use direct assignment?

2. **Move/Copy Functionality:** Is this actually needed?
   - Common use case: Volunteer switches from 9am → 2pm shift (Move)
   - Common use case: Volunteer helps at multiple shifts (Copy)
   - OR: Just let admin Delete + Re-add?

3. **Phase 4 Priority:** When do you need availability tracking?
   - Critical for launch?
   - Nice-to-have for v2?

4. **Calendar UI Investment:** Worth the development time?
   - Visual calendar is impressive but complex
   - List-based assignment works but less modern
   - Hybrid approach?

5. **MyShift Integration:** Should we research compatibility?
   - Could save development time if compatible
   - May have licensing / architectural conflicts
   - Need to investigate further

---

## Success Metrics

### Phase 3
- ✅ Zero user confusion about "Available Volunteers"
- ✅ Assignment time reduced from ~5 clicks to ~2 clicks
- ✅ No accidental duplicate assignments
- ✅ Clean, professional UI

### Phase 4
- ✅ 80%+ volunteers provide availability data
- ✅ Assignment suggestions are accurate
- ✅ Reduced "volunteer no-show" due to scheduling conflicts
- ✅ Coordinators save 30%+ time on scheduling

---

## Next Steps

1. **Review this plan** - Stakeholder feedback
2. **Prioritize Phase 3 tasks** - Which quick wins first?
3. **Create tickets** - Break into implementable units
4. **Prototype Phase 4 calendar** - Visual mockup for feedback
5. **Research integrations** - MyShift/Easy Appointments investigation

**Status:** Draft - Awaiting User Feedback
**Created:** 2026-01-02
**Last Updated:** 2026-01-02
