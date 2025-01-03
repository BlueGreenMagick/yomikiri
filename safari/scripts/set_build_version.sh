#!/bin/bash

# Exit if fail
set -e

bundleVersion=$(git log -1 --date=format:"%Y%m%d%H%M%S" --format="%ad")
/usr/libexec/PlistBuddy -c "Add :CFBundleVersion string $bundleVersion" "${TARGET_BUILD_DIR}/${INFOPLIST_PATH}"