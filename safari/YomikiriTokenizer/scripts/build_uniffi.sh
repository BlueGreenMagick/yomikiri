#!/bin/bash

# Exit if fail
set -e

# Import paths from bash and zsh, so .bashrc and zshrc paths are added.
if output=$(bash -lic 'echo $PATH'); then
  PATH="$output:$PATH"
fi
if output=$(zsh -lic 'echo $PATH'); then
  PATH="$output:$PATH"
fi

echo "$PATH"

# If not called from XCode, (but called from terminal) current directory is the project dir.
PROJECT_DIR=${PROJECT_DIR:-'.'}
FRAMEWORK_DIR="$PROJECT_DIR"
PROJECT_ROOT="$PROJECT_DIR/../.."

TARGET_DIR="$PROJECT_ROOT/target"
# Both iphone and ipad simulator
if [ "$PLATFORM_NAME" = "iphonesimulator" ]; then
  cp "$TARGET_DIR/aarch64-apple-ios-sim/release/libyomikiri_rs.a" "$FRAMEWORK_DIR/rust/libyomikiri_rs.a"
else
  cp "$TARGET_DIR/aarch64-apple-ios/release/libyomikiri_rs.a" "$FRAMEWORK_DIR/rust/libyomikiri_rs.a"
fi
