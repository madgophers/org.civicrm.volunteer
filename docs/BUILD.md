# Building the CiviCRM Volunteer Extension

This document explains how to build a distributable zip file for the org.civicrm.volunteer extension.

## Quick Start

To build a new release zip:

```bash
cd /path/to/org.civicrm.volunteer
./build-release.sh
```

The script will create `zip/org.civicrm.volunteer-{VERSION}.zip` ready for installation in CiviCRM.

## Prerequisites

- **zip utility**: The build script uses the `zip` command
  ```bash
  # Install on Debian/Ubuntu:
  sudo apt-get install zip
  ```

- **Working directory**: You must run the script from the extension root directory (where `info.xml` is located)

## Build Process

### 1. Update Version (if needed)

Before building a new release, update the version number in `info.xml`:

```xml
<extension key="org.civicrm.volunteer" type="module">
  <file>volunteer</file>
  <name>CiviVolunteer</name>
  <description>Volunteer Management</description>
  <license>AGPL-3.0</license>
  <maintainer>
    <author>CiviCRM LLC</author>
    <email>info@civicrm.org</email>
  </maintainer>
  <version>2.6.0</version>  <!-- UPDATE THIS -->
  <releaseDate>2025-12-29</releaseDate>  <!-- UPDATE THIS -->
  <!-- ... -->
</extension>
```

**Version Guidelines:**
- **Major version** (3.0.0): Breaking changes, major architecture changes
- **Minor version** (2.7.0): New features, non-breaking changes
- **Patch version** (2.6.1): Bug fixes, minor updates

### 2. Run Build Script

```bash
./build-release.sh
```

**What the script does:**
1. Validates you're in the extension root directory (checks for `info.xml`)
2. Extracts version number from `info.xml`
3. Creates `zip/` directory if it doesn't exist
4. Removes any existing zip for this version
5. Creates new zip with all extension files
6. Displays build summary with file count and size
7. Shows next steps for testing and committing

**Example output:**
```
========================================
CiviCRM Volunteer Extension Build Script
========================================

Extension Version: 2.6.0

Creating org.civicrm.volunteer-2.6.0.zip...

✓ Build successful!

  Output: zip/org.civicrm.volunteer-2.6.0.zip
  Size: 234K
  Files: 197

Package Contents:
  Length      Date    Time    Name
---------  ---------- -----   ----
      718  2025-12-31 10:30   agpl-3.0.exception.txt
        0  2025-12-31 10:30   css/
  ...

Build complete! Ready to install in CiviCRM.

Next steps:
  1. Test the extension by installing zip/org.civicrm.volunteer-2.6.0.zip in CiviCRM
  2. If everything works, commit the zip file:
     git add zip/org.civicrm.volunteer-2.6.0.zip
     git commit -m 'Build release 2.6.0'
```

### 3. Verify the Build

Before committing, verify the zip contents:

```bash
# List all files in the zip
unzip -l zip/org.civicrm.volunteer-2.6.0.zip

# Count files
unzip -l zip/org.civicrm.volunteer-2.6.0.zip | tail -1

# Extract to temporary directory for inspection
mkdir -p /tmp/verify-build
unzip zip/org.civicrm.volunteer-2.6.0.zip -d /tmp/verify-build
ls -la /tmp/verify-build
```

**What should be included:**
- ✅ All PHP code (`CRM/`, `api/`, `Civi/`, `volunteer.php`, `volunteer.civix.php`)
- ✅ All Angular code (`ang/volunteer/`, `ang/volunteer.js`, `ang/volunteer.ang.php`)
- ✅ All templates (`templates/`)
- ✅ All assets (`css/`, `img/`, `js/`)
- ✅ Configuration (`xml/`, `settings/`, `mixin/`)
- ✅ Documentation (`docs/`, `README.md`, `MODERNIZATION_PLAN.md`)
- ✅ Tests (`tests/`)
- ✅ Metadata (`info.xml`, `agpl-3.0.txt`)

**What should be excluded:**
- ❌ `.git/` directory
- ❌ `.gitignore` and other hidden files (`.DS_Store`, etc.)
- ❌ `build-release.sh` (this build script itself)
- ❌ `zip/` directory (don't nest zips)
- ❌ Backup files (`*~`, `*.bak`)
- ❌ `bin/setup.conf`
- ❌ `update.sh`
- ❌ `nbproject/`

### 4. Test Installation

**Test in a CiviCRM development environment:**

1. Navigate to CiviCRM Extensions page:
   - Drupal: `/civicrm/admin/extensions?reset=1`
   - WordPress: `/wp-admin/admin.php?page=CiviCRM&q=civicrm/admin/extensions&reset=1`

2. Click "Add New" → Upload the zip file

3. Enable the extension

4. Test key functionality:
   - Create a new volunteer project
   - Define volunteer needs
   - Assign volunteers
   - Log volunteer hours
   - View volunteer reports

5. Check browser console for JavaScript errors

6. Verify Angular components work properly:
   - Navigation between project tabs
   - Modal dialogs (log hours, roster)
   - Batch operations (enable/disable/delete projects)
   - Confirmation dialogs

### 5. Commit and Release

Once verified, commit the zip file:

```bash
git add zip/org.civicrm.volunteer-2.6.0.zip
git commit -m "$(cat <<'EOF'
Build release 2.6.0

Generated using build-release.sh script.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

Push to repository:

```bash
git push origin dev
```

**For GitHub releases:**

```bash
# Create annotated tag
git tag -a v2.6.0 -m "Release version 2.6.0"

# Push tag
git push origin v2.6.0

# Create GitHub release using gh CLI
gh release create v2.6.0 \
  --title "CiviVolunteer 2.6.0" \
  --notes "See CHANGELOG.md for details" \
  zip/org.civicrm.volunteer-2.6.0.zip
```

## Troubleshooting

### "zip: command not found"

Install the zip utility:
```bash
sudo apt-get install zip  # Debian/Ubuntu
sudo yum install zip      # RHEL/CentOS
brew install zip          # macOS
```

### "Error: info.xml not found"

You must run the build script from the extension root directory:
```bash
cd /path/to/org.civicrm.volunteer
./build-release.sh
```

### "Error: Could not extract version from info.xml"

Verify `info.xml` contains a valid `<version>` tag:
```bash
grep "<version>" info.xml
```

### Build creates zero-byte or corrupt zip

Check disk space:
```bash
df -h .
```

Verify file permissions:
```bash
ls -la build-release.sh
# Should show: -rwxr-xr-x (executable)
```

### Zip contains unwanted files

The build script excludes files based on patterns in `.gitignore` and hardcoded exclusions.

To see what would be included before building:
```bash
zip -r /tmp/test.zip . \
    -x '.git/*' -x '.gitignore' -x '.*' -x '*~' -x '*.bak' \
    -x 'bin/setup.conf' -x 'update.sh' -x 'nbproject/*' \
    -x 'build-release.sh' -x 'zip/*' \
    --dry-run
```

## Build Script Details

### File: `build-release.sh`

The build script is a simple bash script that:
- Uses `set -e` to exit on any error
- Validates the working directory by checking for `info.xml`
- Extracts version using `grep` with Perl regex
- Creates zip using native `zip` command with exclusion patterns
- Provides colored terminal output for better readability
- Shows build summary with file count and size

### Exclusion Patterns

The script excludes files matching these patterns:

| Pattern | Description | Reason |
|---------|-------------|--------|
| `.git/*` | Git repository data | Not needed in distribution |
| `.gitignore` | Git configuration | Not needed in distribution |
| `.*` | All hidden files | System files, not part of extension |
| `*~` | Backup files | Editor temporary files |
| `*.bak` | Backup files | Editor temporary files |
| `bin/setup.conf` | Setup configuration | Local development only |
| `update.sh` | Update script | Local development only |
| `nbproject/*` | NetBeans project | IDE configuration |
| `build-release.sh` | This script | Build tool, not extension code |
| `zip/*` | Existing zips | Don't nest zips |

## Automation

### GitHub Actions (Future)

Create `.github/workflows/build.yml` for automated builds:

```yaml
name: Build Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Extension
        run: ./build-release.sh
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: zip/*.zip
```

### CI/CD Integration

The build script is designed to be CI/CD friendly:
- Exit code 0 on success, non-zero on failure
- No interactive prompts
- Colorized output can be disabled by unsetting color variables
- Outputs to `zip/` directory (can be artifacts directory)

## Version History

| Version | Date | Build Script Version | Notes |
|---------|------|---------------------|-------|
| 2.6.0 | 2025-12-31 | 1.0 | First version with automated build script |

## Related Documentation

- [Installation Guide](INSTALLATION.md) - How to install the extension
- [Modernization Plan](../MODERNIZATION_PLAN.md) - Technical architecture
- [Angular Service Wrappers](angular-service-wrappers.md) - Angular integration patterns
- [Phase 2 Plan](PHASE2_MODERNIZATION_PLAN.md) - Future development roadmap

## Support

For build issues or questions:
- Check the [GitHub Issues](https://github.com/madgophers/org.civicrm.volunteer/issues)
- Review [CiviCRM Extension Documentation](https://docs.civicrm.org/dev/en/latest/extensions/)
- Contact the maintainers
