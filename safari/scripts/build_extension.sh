#!/bin/bash

# Exit if fail
set -e

# Skip script when previewing / testing swift code
if [ "${ENABLE_PREVIEWS}" = "YES" ] || [ "${CONFIGURATION}" = "Test" ]; then
  echo "Skipping scripts when building for previews"
  exit 0
fi

# Import paths from bash and zsh, so .bashrc and zshrc paths are added.
if output=$(bash -lic 'echo $PATH'); then
  PATH="$output:$PATH"
fi
if output=$(zsh -lic 'echo $PATH'); then
  PATH="$output:$PATH"
fi

echo "$PATH"

# EXTENSION_DIR="$PROJECT_DIR/../main"

if [ "$CONFIGURATION" = "Debug" ]; then
  pnpm task dev:ios
else
  pnpm task build:ios
  # Update build version
fi

