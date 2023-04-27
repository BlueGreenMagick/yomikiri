#!/bin/sh

# Copy files in linked `build` directory into `Resources` root,
# instead of in subdirectory of `Resources/build`
#
# XCode is configured to run this script in the build phase

COPY_FROM="$PROJECT_DIR/../extension/build/."
COPY_TO="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"

cp -RpL "$COPY_FROM" "$COPY_TO"
