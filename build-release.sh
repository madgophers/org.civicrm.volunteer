#!/bin/bash
#
# Build script for org.civicrm.volunteer extension
# Creates a distributable zip file for CiviCRM installation
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CiviCRM Volunteer Extension Build Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Verify we're in the extension root directory
if [ ! -f "info.xml" ]; then
    echo -e "${RED}Error: info.xml not found. Please run this script from the extension root directory.${NC}"
    exit 1
fi

# Extract version from info.xml
VERSION=$(grep -oP '(?<=<version>)[^<]+' info.xml | head -1)
if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Could not extract version from info.xml${NC}"
    exit 1
fi

echo -e "${YELLOW}Extension Version: ${VERSION}${NC}"
echo ""

# Define the zip filename
ZIP_NAME="org.civicrm.volunteer-${VERSION}.zip"
ZIP_PATH="zip/${ZIP_NAME}"

# Create zip directory if it doesn't exist
mkdir -p zip

# Remove old zip if it exists
if [ -f "$ZIP_PATH" ]; then
    echo -e "${YELLOW}Removing existing ${ZIP_NAME}...${NC}"
    rm "$ZIP_PATH"
fi

echo -e "${GREEN}Creating ${ZIP_NAME}...${NC}"
echo ""

# Create the zip file
# Include all files EXCEPT:
#   - .git/ directory and .git* files
#   - .gitignore and other hidden files (.*)
#   - backup files (*~, *.bak)
#   - bin/setup.conf
#   - update.sh
#   - nbproject/
#   - build-release.sh (this script itself)
#   - zip/ directory (don't include zips in zips)

zip -r "$ZIP_PATH" . \
    -x '.git/*' \
    -x '.gitignore' \
    -x '.*' \
    -x '*~' \
    -x '*.bak' \
    -x 'bin/setup.conf' \
    -x 'update.sh' \
    -x 'nbproject/*' \
    -x 'build-release.sh' \
    -x 'zip/*' \
    > /dev/null

# Check if zip was created successfully
if [ -f "$ZIP_PATH" ]; then
    FILE_SIZE=$(ls -lh "$ZIP_PATH" | awk '{print $5}')
    FILE_COUNT=$(unzip -l "$ZIP_PATH" | tail -1 | awk '{print $2}')

    echo -e "${GREEN}✓ Build successful!${NC}"
    echo ""
    echo -e "  Output: ${ZIP_PATH}"
    echo -e "  Size: ${FILE_SIZE}"
    echo -e "  Files: ${FILE_COUNT}"
    echo ""

    # Show what's included (summary)
    echo -e "${YELLOW}Package Contents:${NC}"
    unzip -l "$ZIP_PATH" | head -20
    echo "  ..."
    echo ""
    echo -e "${GREEN}Build complete! Ready to install in CiviCRM.${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Test the extension by installing ${ZIP_PATH} in CiviCRM"
    echo "  2. If everything works, commit the zip file:"
    echo "     git add ${ZIP_PATH}"
    echo "     git commit -m 'Build release ${VERSION}'"
    echo ""
else
    echo -e "${RED}Error: Failed to create ${ZIP_PATH}${NC}"
    exit 1
fi
