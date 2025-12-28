# CiviVolunteer Modernized - Installation Guide

**Version:** 2.5.0 (Modernized with Phase 0 & Phase 1 improvements)
**Date:** 2025-12-28

## What's New in This Version

✅ **Phase 0 (COMPLETED):** Removed org.civicrm.angularprofiles dependency
✅ **Phase 1 (COMPLETED):** Added conflict detection to prevent double-booking volunteers

This version can be installed on fresh CiviCRM instances without any additional dependencies!

---

## Prerequisites

- **CiviCRM:** 5.71 or higher
- **PHP:** 7.4 or higher (recommended: 8.1+)
- **Permissions:** CiviCRM administrator access

---

## Installation Methods

### Method 1: Upload ZIP File via CiviCRM UI (Recommended for Most Users)

**Best for:** Non-technical users, production environments

**Steps:**

1. **Download the ZIP file:**
   - Get `org.civicrm.volunteer-modernized.zip` from your repository
   - Or create it using the packaging script (see below)

2. **Upload to CiviCRM:**
   - Log into CiviCRM as administrator
   - Navigate to: **Administer > System Settings > Extensions**
   - Click **Add New** tab
   - Click **Choose File** and select `org.civicrm.volunteer-modernized.zip`
   - Click **Upload**

3. **Install the extension:**
   - After upload completes, the extension will appear in the list
   - Click **Install** next to "CiviVolunteer"
   - Wait for installation to complete
   - You should see a success message

4. **Verify installation:**
   - Navigate to: **CiviCRM > Volunteers** (new menu item)
   - You should see "Manage Projects" and other volunteer options

**Troubleshooting:**
- If you see "Missing Requirement" errors, make sure you're using the modernized version (no angularprofiles dependency)
- If upload fails, check your CiviCRM extensions directory permissions
- Maximum upload size: Check your PHP `upload_max_filesize` setting

---

### Method 2: Git Clone (Recommended for Developers)

**Best for:** Development, testing, contributing back changes

**Steps:**

1. **Find your CiviCRM extensions directory:**
   ```bash
   # Common locations:
   # Drupal: sites/default/files/civicrm/ext/
   # WordPress: wp-content/uploads/civicrm/ext/
   # Joomla: media/civicrm/ext/
   # Standalone: web/sites/default/files/civicrm/ext/

   # Or check via CiviCRM UI:
   # Administer > System Settings > Directories
   # Look for "CiviCRM Extensions Directory"
   ```

2. **Clone the repository:**
   ```bash
   cd /path/to/civicrm/extensions
   git clone https://github.com/madgophers/org.civicrm.volunteer.git
   cd org.civicrm.volunteer
   git checkout claude/explore-codebase-structure-PKUon
   ```

3. **Set permissions:**
   ```bash
   # Make sure web server can read the files
   chown -R www-data:www-data org.civicrm.volunteer
   chmod -R 755 org.civicrm.volunteer
   ```

4. **Install via CiviCRM UI:**
   - Navigate to: **Administer > System Settings > Extensions**
   - Click **Refresh** to scan for new extensions
   - Find "CiviVolunteer" in the list
   - Click **Install**

5. **For development work:**
   ```bash
   # Create your own branch
   git checkout -b my-feature-branch

   # Make changes, test, commit
   git add .
   git commit -m "Description of changes"
   git push origin my-feature-branch
   ```

**Advantages:**
- Easy to update (`git pull`)
- Can contribute changes back to the project
- Full git history for debugging

---

### Method 3: Manual Copy (For Specific Scenarios)

**Best for:** Custom deployments, restricted environments

**Steps:**

1. **Copy the extension directory:**
   ```bash
   # On your local machine or build server
   cd /path/to/repository
   cp -r org.civicrm.volunteer /path/to/civicrm/extensions/
   ```

2. **Remove unnecessary files (optional):**
   ```bash
   cd /path/to/civicrm/extensions/org.civicrm.volunteer
   rm -rf .git .gitignore tests/phpunit docs/MODERNIZATION_PLAN.md
   ```

3. **Set correct permissions:**
   ```bash
   chown -R www-data:www-data /path/to/civicrm/extensions/org.civicrm.volunteer
   chmod -R 755 /path/to/civicrm/extensions/org.civicrm.volunteer
   ```

4. **Install via CiviCRM UI:**
   - Navigate to: **Administer > System Settings > Extensions**
   - Click **Refresh**
   - Install CiviVolunteer

---

## Creating the ZIP Package (For Distributors)

If you need to create the ZIP file yourself:

```bash
cd /home/user

# Create optimized ZIP (excludes git, tests, docs)
zip -r org.civicrm.volunteer-modernized.zip org.civicrm.volunteer \
  -x "org.civicrm.volunteer/.git/*" \
  -x "org.civicrm.volunteer/.gitignore" \
  -x "org.civicrm.volunteer/tests/*" \
  -x "org.civicrm.volunteer/docs/*" \
  -x "org.civicrm.volunteer/mkdocs.yml"

# Verify the ZIP
unzip -l org.civicrm.volunteer-modernized.zip | head -20

# Check size (should be ~250KB)
ls -lh org.civicrm.volunteer-modernized.zip
```

---

## Post-Installation Configuration

### 1. Configure Permissions

Navigate to: **Administer > Users and Permissions > Permissions (Access Control)**

Assign these volunteer-specific permissions:

- **administer CiviVolunteer:** Full volunteer management access
- **edit own volunteer projects:** Coordinators can edit their assigned projects
- **edit all volunteer projects:** Administrators can edit any project
- **register to volunteer:** Public users can sign up for opportunities
- **delete in CiviVolunteer:** Can delete volunteer records

**Recommended permission sets:**

**Volunteer Coordinators:**
- edit own volunteer projects
- register to volunteer
- view event info

**Volunteer Administrators:**
- administer CiviVolunteer
- edit all volunteer projects
- delete in CiviVolunteer

**Public/Anonymous Users:**
- register to volunteer
- view event info

### 2. Configure Volunteer Roles

Navigate to: **Administer > System Settings > Option Groups > Volunteer Role**

Create roles for your organization:
- Greeter
- Registration Desk
- Setup/Teardown
- Guest Services
- etc.

### 3. Create Your First Volunteer Project

Navigate to: **CiviCRM > Volunteers > Manage Projects > Create New Project**

Fill in:
- **Project Title:** Name of your volunteer opportunity
- **Project Description:** What volunteers will do
- **Campaign:** (optional) Associate with a campaign
- **Location:** Where volunteers will work

**Volunteer Registration section:**
- Click "add another profile"
- Select which CiviCRM Profile(s) to use for registration forms
  - Note: This now uses CiviCRM's native profile selector (no angularprofiles needed!)
- Choose "Use For": Individual, Group, or Both

### 4. Define Volunteer Opportunities

After creating a project:
1. Click **Define Volunteer Opportunities** (or save and continue)
2. Add opportunities/needs:
   - **Role:** What volunteers will do
   - **Quantity Needed:** How many volunteers needed
   - **Schedule Type:**
     - **Set Shift:** Specific date/time (e.g., "Dec 1, 9 AM-12 PM")
     - **Flexible Timeframe:** Date range with duration
     - **Open-Ended:** No specific time commitment
   - **Start Date/Time:** When the shift begins
   - **Duration:** How long the shift lasts

### 5. Test Conflict Detection (NEW in Phase 1!)

Try double-booking a volunteer to verify conflict detection works:

1. Create two overlapping opportunities:
   - Shift A: Dec 1, 9:00 AM - 11:00 AM
   - Shift B: Dec 1, 10:00 AM - 12:00 PM

2. Assign a volunteer to Shift A (should succeed)

3. Try to assign the same volunteer to Shift B (should fail with clear error message)

4. Expected error:
   > "This volunteer is already assigned to an overlapping opportunity: [Shift A details]"

---

## Upgrading from Original CiviVolunteer

### If You Already Have CiviVolunteer Installed:

**Option A: Upgrade in Place (Recommended)**

1. **Backup first!**
   ```bash
   # Backup your database
   mysqldump -u user -p database_name > civicrm_backup.sql

   # Backup current extension
   cp -r /path/to/civicrm/ext/org.civicrm.volunteer /path/to/backup/
   ```

2. **Uninstall old extension:**
   - Administer > System Settings > Extensions
   - Find CiviVolunteer
   - Click **Disable**, then **Uninstall**
   - **IMPORTANT:** This preserves your data (projects, assignments, etc.)

3. **Install modernized version:**
   - Follow Method 1, 2, or 3 above
   - Your volunteer data will be preserved

4. **Verify:**
   - Check that your projects still exist: CiviCRM > Volunteers > Manage Projects
   - Verify assignments are intact
   - Test profile selector in project creation (should work without angularprofiles)

**Option B: Side-by-Side Testing (Development Only)**

Not recommended for production - extensions share the same database tables.

---

## Verifying Installation

### Quick Verification Checklist:

✅ **Menu items exist:**
- CiviCRM > Volunteers (main menu)
- Volunteers > Manage Projects
- Volunteers > Find Volunteers

✅ **Extensions page shows:**
- Extension: CiviVolunteer (Modernized)
- Status: Enabled
- Version: 2.5.0
- No dependency warnings

✅ **Profile selector works:**
- Create new project
- Scroll to "Volunteer Registration"
- Click "add another profile"
- Profile selector should show autocomplete search (no errors)

✅ **Conflict detection works:**
- Create two overlapping opportunities
- Try to assign same volunteer to both
- Should prevent double-booking with clear error

✅ **No console errors:**
- Open browser developer tools (F12)
- Navigate volunteer pages
- Check for JavaScript errors (especially related to angularprofiles)

---

## Troubleshooting

### Extension Won't Install

**Error:** "Missing Requirement: org.civicrm.angularprofiles"

**Solution:** You're using the old version. Get the modernized version from the `claude/explore-codebase-structure-PKUon` branch.

---

**Error:** "Extension directory not writable"

**Solution:**
```bash
chmod 755 /path/to/civicrm/ext
chown www-data:www-data /path/to/civicrm/ext
```

---

**Error:** "Extension appears to be damaged"

**Solution:**
1. Check info.xml exists and is valid
2. Verify file permissions
3. Try refreshing extensions list
4. Check CiviCRM system status for issues

---

### Profile Selector Not Working

**Symptom:** Profile selector shows no profiles or errors

**Solutions:**
1. **Check permissions:** Make sure you have "access CiviCRM" permission
2. **Verify profiles exist:** Administer > Customize Data and Screens > Profiles
3. **Clear cache:** Administer > System Settings > Cleanup Caches and Update Paths
4. **Check browser console:** Look for JavaScript errors

---

### Conflict Detection Not Working

**Symptom:** Can assign volunteers to overlapping shifts

**Solutions:**
1. **Check opportunity types:** Conflict detection only works for "Set Shift" opportunities (not flexible/open-ended)
2. **Verify Phase 1 installed:** Check for `CRM/Volunteer/BAO/ConflictChecker.php`
3. **Test with specific times:** Make sure both shifts have start_time and duration
4. **Check error logs:** Look for PHP errors in CiviCRM logs

---

### Database Errors on Installation

**Error:** SQL errors during installation

**Solution:**
1. Check MySQL version compatibility (5.7+ recommended)
2. Verify database user has CREATE/ALTER permissions
3. Check for table name conflicts
4. Review CiviCRM ConfigAndLog for detailed errors

---

## Uninstalling

To completely remove CiviVolunteer:

1. **Disable extension:**
   - Administer > System Settings > Extensions
   - Click **Disable** next to CiviVolunteer

2. **Uninstall extension:**
   - Click **Uninstall**
   - This removes database tables and volunteer data

3. **Remove files (optional):**
   ```bash
   rm -rf /path/to/civicrm/ext/org.civicrm.volunteer
   ```

**WARNING:** Uninstalling removes ALL volunteer data (projects, assignments, hours). Backup first!

---

## Support & Contributing

### Getting Help:

- **Documentation:** `/docs/` directory in this extension
- **Issues:** https://github.com/madgophers/org.civicrm.volunteer/issues
- **CiviCRM Community:** https://chat.civicrm.org/

### Contributing:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

See `MODERNIZATION_PLAN.md` for our roadmap and upcoming features.

---

## What's Next?

After installation, check out:

- **Phase 0 Documentation:** `docs/phase0-remove-angularprofiles.md`
- **Conflict Detection Guide:** `docs/conflict-detection.md`
- **Security Documentation:** `docs/SECURITY.md`
- **Modernization Roadmap:** `MODERNIZATION_PLAN.md`

**Coming Soon (Phase 2):**
- FullCalendar integration for better opportunity browsing
- Bootstrap 5 UI improvements
- Multi-step volunteer sign-up wizard

---

## License

CiviVolunteer is licensed under AGPL-3.0. See `agpl-3.0.txt` for details.

## Credits

**Original Development:** Ginkgo Street Labs and CiviCRM, LLC
**Modernization (Phase 0 & 1):** 2025-12-28
**Special Thanks:** Friends of Georgia State Parks & Historic Sites, The Manhattan Neighborhood Network
