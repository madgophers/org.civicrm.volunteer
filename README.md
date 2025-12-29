# ⚠️ CiviVolunteer NG (Next Generation) - INDEPENDENT FORK

**This is an INDEPENDENT FORK maintained by Madgophers, NOT the official CiviVolunteer project.**

**Official Project:** [civicrm/org.civicrm.volunteer](https://github.com/civicrm/org.civicrm.volunteer)
**This Fork:** [madgophers/org.civicrm.volunteer](https://github.com/madgophers/org.civicrm.volunteer)

---

## ⚠️ Important Notices

- **NOT AFFILIATED** with the official CiviVolunteer project
- **NOT A DROP-IN REPLACEMENT** - This is a modernized rewrite with breaking changes
- **FOR CiviCRM 6.9.1+** only (uses Angular instead of deprecated Backbone/Marionette)
- **IN ACTIVE DEVELOPMENT** - Not yet ready for production use (Phase 2 in progress)
- **USE AT YOUR OWN RISK** - No warranty or support guarantees

---

## What is CiviVolunteer NG?

CiviVolunteer NG is a modernized fork of CiviVolunteer that:

  * Removes dependency on deprecated Backbone.js and Marionette.js libraries
  * Migrates to modern AngularJS architecture (compatible with CiviCRM 6.9.1+)
  * Adds volunteer assignment conflict detection (prevents double-booking)
  * Removes org.civicrm.angularprofiles dependency
  * Provides improved error handling and UX

---

## Current Status

**Version:** 2.6.0 (PRODUCTION READY)

| Feature | Status | Notes |
|---------|--------|-------|
| Project Management | ✅ Working | Create/edit/list volunteer projects |
| Conflict Detection | ✅ Working | Prevents volunteer double-booking |
| Define Opportunities | ✅ Working | Angular-based opportunity management |
| Assign Volunteers | ✅ Working | Angular-based assignment with conflict detection |
| Search Volunteers | ✅ Working | Integrated volunteer search with bulk assignment |

**✅ READY FOR PRODUCTION USE** - Phase 2 complete, all features migrated to Angular.

---

## Why This Fork Exists

**Problem:** CiviCRM 6.9.1+ removed Backbone.js and Marionette.js libraries that the official CiviVolunteer extension depends on.

**Solution:** This fork modernizes the codebase to use AngularJS (already used by CiviCRM core) instead of deprecated frameworks.

**Modernization Phases:**
- ✅ **Phase 0 Complete:** Removed org.civicrm.angularprofiles dependency
- ✅ **Phase 1 Complete:** Added conflict detection for volunteer assignments
- ✅ **Phase 2 Complete:** All Backbone/Marionette code migrated to Angular

---

## Differences from Official CiviVolunteer

| Aspect | Official Version | This Fork (NG) |
|--------|------------------|----------------|
| **CiviCRM Compatibility** | Up to ~6.8.x | 6.9.1+ |
| **UI Framework** | Backbone/Marionette | AngularJS |
| **Profile Dependency** | org.civicrm.angularprofiles | None (uses native entityRef) |
| **Conflict Detection** | No | Yes (prevents double-booking) |
| **Maintainer** | CiviCRM Community | MadGophers |
| **Status** | Deprecated (Backbone removed) | Active development |

---

## Installation

### Prerequisites

- CiviCRM 6.9.1 or higher
- PHP 7.4 or higher

### Installation Steps

1. Download the latest release from this repository
2. Extract to your CiviCRM extensions directory
3. Run: `cv en org.civicrm.volunteer`
4. Navigate to **Volunteers > Manage Volunteer Projects** to get started

### Upgrading from Official CiviVolunteer

**⚠️ WARNING:** This is NOT a drop-in replacement. Do not attempt to upgrade from the official CiviVolunteer extension without testing first. The UI has been completely rewritten in Angular.

**Recommended Approach:**
1. Test on a staging/development site first
2. Backup your database before upgrading
3. Disable the official org.civicrm.volunteer extension
4. Install this version as a replacement
5. Test all features thoroughly before deploying to production

---

## Development Roadmap

### Phase 2 (✅ COMPLETE - December 2025)

**Goal:** Migrate remaining Backbone views to Angular

**Completed Components:**
1. ✅ **Define Opportunities** - Angular-based opportunity management
2. ✅ **Assign Volunteers** - Angular-based assignment with integrated search
3. ✅ **Search Volunteers** - Integrated volunteer search with bulk assignment and conflict detection

**Result:**
- All features work with CiviCRM 6.9.1+
- Full Angular-based architecture
- All Backbone/Marionette dependencies removed
- v2.6.0 released (first stable production version)

### Future Phases (Planned)

**Phase 3:** Advanced features
- Enhanced volunteer hours logging
- Advanced conflict resolution UI
- Volunteer availability calendars
- Email notifications for assignments

**Phase 4:** Framework updates
- Evaluate migration to modern framework (React/Vue) if CiviCRM core migrates
- Follow CiviCRM's architectural direction

---

## Contributing

This is an open-source project under AGPL-3.0 license.

**Ways to Contribute:**
- Report bugs via [GitHub Issues](https://github.com/madgophers/org.civicrm.volunteer/issues)
- Submit pull requests (must target development branch)
- Help with Phase 2 development (AngularJS experience helpful)
- Test pre-release versions and provide feedback

**Before Contributing:**
- Read `docs/SESSION_CONTINUATION_GUIDE.md` for project status
- Read `docs/PHASE2_MODERNIZATION_PLAN.md` for Phase 2 details
- Check existing issues before creating new ones

---

## Documentation

**This Fork:**
- [Session Continuation Guide](docs/SESSION_CONTINUATION_GUIDE.md) - Project status and how to resume work
- [Phase 2 Plan](docs/PHASE2_MODERNIZATION_PLAN.md) - Detailed migration plan
- [Phase 0 Documentation](docs/phase0-remove-angularprofiles.md) - angularprofiles removal details

**Official CiviVolunteer (for reference):**
- [Official Documentation](https://docs.civicrm.org/volunteer/en/latest/)
- Note: Official docs may not apply to this fork due to architectural differences

---

## Support

**This is an independent community project.**

**No Official Support:** This fork is maintained by MadGophers as an open-source project. Use at your own risk.

**Community Support:**
- GitHub Issues for bug reports
- Pull requests welcome
- Questions: Open a GitHub Discussion

**For Official CiviVolunteer:**
- See [civicrm/org.civicrm.volunteer](https://github.com/civicrm/org.civicrm.volunteer)
- [CiviCRM StackExchange](http://civicrm.stackexchange.com/questions/tagged/civivolunteer)

---

## License

AGPL-3.0 (same as official CiviVolunteer and CiviCRM core)

**Original Development:** Ginkgo Street Labs and CiviCRM, LLC with contributions from the community.

**Fork Maintainer:** MadGophers (2025-present)

**Credits:**
- Original: Friends of Georgia State Parks & Historic Sites (funding initial release)
- Original: The Manhattan Neighborhood Network (funding 1.4 release)
- This Fork: MadGophers (modernization and CiviCRM 6.9.1+ compatibility)

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 2.6.0 | 2025-12-29 | ✅ Production | First stable release - Phase 2 complete, all features working |
| 2.5.0 | - | ❌ Not Released | Internal milestone (Phases 0&1 complete, but UI migration incomplete) |
| 2.4.6 | - | - | Last official upstream release before fork |

---

**⚠️ REMINDER: This is an INDEPENDENT FORK. Use the official CiviVolunteer project if you need production-ready software compatible with CiviCRM < 6.9.**
