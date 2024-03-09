#!/bin/bash
# Import paths from bash and zsh, so .bashrc and zshrc paths are added.

# Exit if fail
set -e

if output=$(bash -lic 'echo $PATH'); then
  PATH="$output:$PATH"
fi
if output=$(zsh -lic 'echo $PATH'); then
  PATH="$output:$PATH"
fi

echo "$PATH"

# EXTENSION_DIR="$PROJECT_DIR/../main"

if [ "$CONFIGURATION" = "Debug" ]; then
  pnpm run -w "build:ios"
else
  pnpm run -w "construct:all"
  pnpm run -w "build:ios"
fi