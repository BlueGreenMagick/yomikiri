#!/bin/sh
# XCode tries to be helpful and overwrites the PATH. Reset that.
PATH="$(bash -l -c 'echo $PATH')"
PATH="/opt/homebrew/bin:$PATH"
PATH="/opt/homebrew/opt/node@16/bin:$PATH"

# Copy files in linked `build` directory into `Resources` root,
# instead of in subdirectory of `Resources/build`
#
# XCode is configured to run this script in the build phase
EXTENSION_DIR="$PROJECT_DIR/../extension"
COPY_FROM="$EXTENSION_DIR/build/."
COPY_TO="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"

yarn --cwd $EXTENSION_DIR build:ios
cp -RpL "$COPY_FROM" "$COPY_TO"
