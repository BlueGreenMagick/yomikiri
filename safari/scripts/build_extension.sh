#!/bin/sh
# Import paths from bash and zsh, so .bashrc and zshrc paths are added.
if output=$(bash -lic 'echo $PATH'); then
  PATH="$output:$PATH"
fi
if output=$(zsh -lic 'echo $PATH'); then
  PATH="$output:$PATH"
fi

echo $PATH

EXTENSION_DIR="$PROJECT_DIR/../extension"

if [ "$CONFIGURATION" = "Debug" ]; then
  RUN_CMD="dev:ios"
else
  RUN_CMD="build:ios"
fi

pnpm run --dir "$EXTENSION_DIR" "build:iosapp"
pnpm run --dir "$EXTENSION_DIR" "$RUN_CMD"
