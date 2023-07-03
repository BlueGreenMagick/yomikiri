#!/bin/sh
# XCode tries to be helpful and overwrites the PATH. Reset that.
PATH="$(bash -l -c 'echo $PATH')"
PATH="/opt/homebrew/bin:$PATH"
PATH="/opt/homebrew/opt/node@16/bin:$PATH"

EXTENSION_DIR="$PROJECT_DIR/../extension"

if [ "$CONFIGURATION" = "Debug" ]; then
  YARN_CMD="dev:ios"
else
  YARN_CMD="build:ios"
fi

yarn --cwd "$EXTENSION_DIR" "build:iosapp"
yarn --cwd "$EXTENSION_DIR" "$YARN_CMD"
