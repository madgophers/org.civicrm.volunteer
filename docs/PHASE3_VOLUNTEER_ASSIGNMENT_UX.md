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

**Unified Availability Table (Recommended Approach)**

Single table handles both recurring availability patterns AND specific blackout periods:

```sql
CREATE TABLE `civicrm_volunteer_availability` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `contact_id` int unsigned NOT NULL COMMENT 'FK to civicrm_contact',
  `availability_type` varchar(20) NOT NULL
    COMMENT 'recurring_available, recurring_unavailable, specific_blackout',

  -- Recurring pattern fields (for recurring types)
  `day_of_week` tinyint DEFAULT NULL
    COMMENT '0=Sun, 1=Mon, ..., 6=Sat (NULL for specific dates)',
  `recurrence_start_date` date DEFAULT NULL
    COMMENT 'When this recurring pattern starts (optional)',
  `recurrence_end_date` date DEFAULT NULL
    COMMENT 'When this recurring pattern ends (optional)',

  -- Time range (used by all types)
  `start_time` time NOT NULL COMMENT 'Start time of availability/unavailability',
  `end_time` time NOT NULL COMMENT 'End time of availability/unavailability',

  -- Specific date fields (for blackout type)
  `specific_start_datetime` datetime DEFAULT NULL
    COMMENT 'For blackouts: exact start datetime',
  `specific_end_datetime` datetime DEFAULT NULL
    COMMENT 'For blackouts: exact end datetime',

  `reason` varchar(255) DEFAULT NULL
    COMMENT 'Optional: "On vacation", "Lunch break", etc.',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created` timestamp DEFAULT CURRENT_TIMESTAMP,
  `last_updated` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_contact_type` (`contact_id`, `availability_type`),
  KEY `idx_day_of_week` (`day_of_week`),
  KEY `idx_specific_dates` (`specific_start_datetime`, `specific_end_datetime`),

  CONSTRAINT FK_civicrm_volunteer_availability_contact
    FOREIGN KEY (`contact_id`) REFERENCES `civicrm_contact`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
```

**Why Single Table?**
- ✅ Handles all use cases: "Mondays 8-4", "evenings", "vacation", "seasonal"
- ✅ Simpler code - one source of truth
- ✅ Extensible - can add new types like "preferred" or "maybe"
- ✅ Natural UI flow - volunteers manage all availability in one place
- ⚠️ Some NULL fields depending on type (acceptable trade-off)

### Real-World Data Examples

**Example 1: "Mondays 8am-4pm"**
```sql
INSERT INTO civicrm_volunteer_availability VALUES (
  contact_id = 123,
  availability_type = 'recurring_available',
  day_of_week = 1,                    -- Monday
  start_time = '08:00:00',
  end_time = '16:00:00',
  recurrence_start_date = NULL,       -- ongoing
  recurrence_end_date = NULL,
  specific_start_datetime = NULL,
  specific_end_datetime = NULL,
  reason = NULL
);
```

**Example 2: "Mon, Tue, Wed evenings (6pm-10pm)"**
UI creates 3 rows automatically:
```sql
-- Row 1: Monday evenings
INSERT ... (day_of_week=1, start_time='18:00', end_time='22:00')
-- Row 2: Tuesday evenings
INSERT ... (day_of_week=2, start_time='18:00', end_time='22:00')
-- Row 3: Wednesday evenings
INSERT ... (day_of_week=3, start_time='18:00', end_time='22:00')
```

**Example 3: "Mondays 8am-12pm and 2pm-6pm (lunch break)"**
UI creates 2 rows for split availability:
```sql
-- Morning shift
INSERT ... (day_of_week=1, start_time='08:00', end_time='12:00')
-- Afternoon shift
INSERT ... (day_of_week=1, start_time='14:00', end_time='18:00')
```

**Example 4: "On vacation July 1-15, 2026"**
```sql
INSERT INTO civicrm_volunteer_availability VALUES (
  contact_id = 123,
  availability_type = 'specific_blackout',
  day_of_week = NULL,                 -- not recurring
  start_time = '00:00:00',            -- all day
  end_time = '23:59:59',
  recurrence_start_date = NULL,
  recurrence_end_date = NULL,
  specific_start_datetime = '2026-07-01 00:00:00',
  specific_end_datetime = '2026-07-15 23:59:59',
  reason = 'On vacation'
);
```

**Example 5: "Available Saturdays June-September (seasonal)"**
```sql
INSERT ... (
  availability_type = 'recurring_available',
  day_of_week = 6,                    -- Saturday
  start_time = '09:00:00',
  end_time = '17:00:00',
  recurrence_start_date = '2026-06-01',  -- summer only
  recurrence_end_date = '2026-09-30',
  specific_start_datetime = NULL,
  specific_end_datetime = NULL,
  reason = 'Summer availability'
)
```

**Example 6: "Never available Sundays (recurring unavailability)"**
```sql
INSERT ... (
  availability_type = 'recurring_unavailable',
  day_of_week = 0,                    -- Sunday
  start_time = '00:00:00',            -- all day
  end_time = '23:59:59',
  reason = 'Family time'
)
```

### UI Design for Availability Entry

**Simple Interface (Public Signup):**
```
┌──────────────────────────────────────────────────────────┐
│ When are you available to volunteer?                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ○ Regular Weekly Availability                           │
│   ☑ Monday     From: [08:00] To: [16:00]               │
│   ☐ Tuesday    From: [__:__] To: [__:__]               │
│   ☑ Wednesday  From: [18:00] To: [22:00]               │
│   ☐ Thursday   From: [__:__] To: [__:__]               │
│   ☐ Friday     From: [__:__] To: [__:__]               │
│   ☐ Saturday   From: [__:__] To: [__:__]               │
│   ☐ Sunday     From: [__:__] To: [__:__]               │
│                                                          │
│   [+ Add another time block for selected days]          │
│                                                          │
│ ○ Times I'm NOT Available                               │
│   From: [____-__-__ __:__] To: [____-__-__ __:__]      │
│   Reason: [________________________]                     │
│   [+ Add another blackout period]                       │
│                                                          │
│ [Save My Availability]                                   │
└──────────────────────────────────────────────────────────┘
```

**Advanced Interface (Admin/Volunteer Profile):**
```
┌──────────────────────────────────────────────────────────┐
│ Volunteer Availability for: John Doe                    │
├──────────────────────────────────────────────────────────┤
│ Regular Weekly Schedule:                                │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ✓ Monday    08:00 - 12:00  [Edit] [Remove]        │  │
│ │ ✓ Monday    14:00 - 18:00  [Edit] [Remove]        │  │
│ │ ✓ Wednesday 18:00 - 22:00  [Edit] [Remove]        │  │
│ │ ✗ Sunday    (Never available)      [Remove]       │  │
│ └────────────────────────────────────────────────────┘  │
│ [+ Add Weekly Availability]                             │
│                                                          │
│ Seasonal/Temporary Availability:                        │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ✓ Saturdays (Jun 1 - Sep 30) 09:00-17:00 [Remove]│  │
│ └────────────────────────────────────────────────────┘  │
│ [+ Add Seasonal Availability]                           │
│                                                          │
│ Blackout Periods (Unavailable):                         │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ✗ Jul 1-15, 2026  "On vacation"       [Remove]    │  │
│ │ ✗ Dec 20-31, 2026 "Holiday travel"    [Remove]    │  │
│ └────────────────────────────────────────────────────┘  │
│ [+ Add Blackout Period]                                 │
│                                                          │
│ [Save Changes]                                           │
└──────────────────────────────────────────────────────────┘
```

### Query Examples

**Check if volunteer is available for Tuesday Jan 7, 2026 at 2pm-6pm:**
```sql
SELECT
  contact_id,
  CASE
    -- First check for specific blackouts
    WHEN EXISTS (
      SELECT 1 FROM civicrm_volunteer_availability
      WHERE contact_id = 123
        AND availability_type = 'specific_blackout'
        AND specific_start_datetime <= '2026-01-07 18:00:00'
        AND specific_end_datetime >= '2026-01-07 14:00:00'
        AND is_active = 1
    ) THEN 'Blacked Out'

    -- Check recurring unavailability
    WHEN EXISTS (
      SELECT 1 FROM civicrm_volunteer_availability
      WHERE contact_id = 123
        AND availability_type = 'recurring_unavailable'
        AND day_of_week = 2  -- Tuesday
        AND start_time <= '14:00:00'
        AND end_time >= '18:00:00'
        AND is_active = 1
    ) THEN 'Not Available (Recurring)'

    -- Check recurring availability
    WHEN EXISTS (
      SELECT 1 FROM civicrm_volunteer_availability
      WHERE contact_id = 123
        AND availability_type = 'recurring_available'
        AND day_of_week = 2  -- Tuesday
        AND start_time <= '14:00:00'
        AND end_time >= '18:00:00'
        AND is_active = 1
        AND (recurrence_start_date IS NULL OR recurrence_start_date <= '2026-01-07')
        AND (recurrence_end_date IS NULL OR recurrence_end_date >= '2026-01-07')
    ) THEN 'Available'

    ELSE 'No Data - Ask Volunteer'
  END as availability_status
FROM civicrm_contact
WHERE id = 123;
```

**Get all volunteers available for a specific shift:**
```sql
SELECT
  c.id,
  c.display_name,
  GROUP_CONCAT(
    CASE a.availability_type
      WHEN 'recurring_available' THEN CONCAT(
        DAYNAME(STR_TO_DATE(a.day_of_week + 1, '%w')),
        ' ',
        a.start_time,
        '-',
        a.end_time
      )
      WHEN 'specific_blackout' THEN CONCAT(
        'Unavailable: ',
        DATE_FORMAT(a.specific_start_datetime, '%b %d'),
        ' - ',
        DATE_FORMAT(a.specific_end_datetime, '%b %d')
      )
    END
    SEPARATOR '; '
  ) as availability_notes
FROM civicrm_contact c
LEFT JOIN civicrm_volunteer_availability a ON c.id = a.contact_id AND a.is_active = 1
WHERE c.contact_type = 'Individual'
  -- Available for Tuesday 2-6pm
  AND EXISTS (
    SELECT 1 FROM civicrm_volunteer_availability va
    WHERE va.contact_id = c.id
      AND va.availability_type = 'recurring_available'
      AND va.day_of_week = 2
      AND va.start_time <= '14:00:00'
      AND va.end_time >= '18:00:00'
  )
  -- NOT blacked out on specific date
  AND NOT EXISTS (
    SELECT 1 FROM civicrm_volunteer_availability ba
    WHERE ba.contact_id = c.id
      AND ba.availability_type = 'specific_blackout'
      AND ba.specific_start_datetime <= '2026-01-07 18:00:00'
      AND ba.specific_end_datetime >= '2026-01-07 14:00:00'
  )
GROUP BY c.id, c.display_name
ORDER BY c.display_name;
```

### Features

**1. Availability Capture on Public Signup**
- Simple checkbox interface for recurring weekly availability
- Multiple time blocks per day (e.g., morning AND afternoon)
- Blackout period entry (vacation, unavailability, etc.)
- All data stored in single unified table with different `availability_type` values

**2. Smart Filtering in Admin Assignment**
When assigning to a shift at specific date/time, the system will:
- Query volunteers with `recurring_available` matching that day/time
- Exclude volunteers with `specific_blackout` during that period
- Exclude volunteers with `recurring_unavailable` for that day/time
- Show availability status for each volunteer:
  - 🟢 **Available:** Has recurring availability, no conflicts
  - 🔴 **Not Available:** Blacked out or recurring unavailability
  - 🟡 **Partial:** Available some days but not others
  - ⚪ **Unknown:** No availability data provided

**3. Volunteer Profile Management**
- Volunteers can manage their own availability via profile page
- Admins can view/edit availability on behalf of volunteers
- List view shows all availability rules with easy edit/remove
- Categories: Regular Weekly, Seasonal, Blackouts

**4. Calendar/Schedule UI (Option C - Long-term)**

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

**Status:** Draft - Schema Updated to Option C (Unified Table)
**Created:** 2026-01-02
**Last Updated:** 2026-01-03
