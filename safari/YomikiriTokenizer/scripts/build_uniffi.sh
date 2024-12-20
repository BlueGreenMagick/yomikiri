#!/bin/bash

# Exit if fail
set -e


# Skip script when previewing / testing swift code
# if [ "${ENABLE_PREVIEWS}" = "YES" ] || [ "${CONFIGURATION}" = "Test" ]; then
#   echo "Skipping scripts when building for previews"
#   exit 0
# fi

# Import paths from bash and zsh, so .bashrc and zshrc paths are added.
# if output=$(bash -lic 'echo $PATH'); then
#   PATH="$output:$PATH"
# fi
# if output=$(zsh -lic 'echo $PATH'); then
#   PATH="$output:$PATH"
# fi

# echo "$PATH"

# If not called from XCode, (but called from terminal) current directory is the project dir.
PROJECT_DIR=${PROJECT_DIR:-'.'}
FRAMEWORK_DIR="$PROJECT_DIR"
PROJECT_ROOT="$PROJECT_DIR/../.."

TARGET_DIR="$PROJECT_ROOT/target"
LIB_FILE_PATH="$FRAMEWORK_DIR/rust/libyomikiri_rs.a"

# Remove file if it exists
rm -f "$LIB_FILE_PATH"


# Link static lib file

# Both iphone and ipad simulator
if [ "$PLATFORM_NAME" = "iphonesimulator" ]; then
  AARCH="aarch64-apple-ios-sim"
else
  AARCH="aarch64-apple-ios"
fi

if [ "$CONFIGURATION" = "Debug" ]; then
  TARGET="debug"
else
  TARGET="release"
fi

ln -s "$TARGET_DIR/$AARCH/$TARGET/libyomikiri_rs.a" "$LIB_FILE_PATH"