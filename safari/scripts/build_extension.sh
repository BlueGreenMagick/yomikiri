#!/bin/sh
# XCode tries to be helpful and overwrites the PATH. Reset that.
PATH="$(bash -l -c 'echo $PATH')"
PATH="/opt/homebrew/bin:$PATH"
PATH="/opt/homebrew/opt/node@16/bin:$PATH"

EXTENSION_DIR="$PROJECT_DIR/../extension"

if [ "$CONFIGURATION" = "Debug" ]; then
  RUN_CMD="dev:ios"
else
  RUN_CMD="build:ios"
fi

pnpm --cwd "$EXTENSION_DIR" "build:iosapp"
pnpm --cwd "$EXTENSION_DIR" "$RUN_CMD"
