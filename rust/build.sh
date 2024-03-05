#!/bin/sh
rm -rf ./swift
rm -rf ./pkg

FILE_PATH=$(realpath "$0")
PROJECT_DIR=$(dirname "$FILE_PATH")

cd "$PROJECT_DIR" || exit 1

# build unidic
cargo run --manifest-path "../unidic/Cargo.toml"

# build uniffi

cargo build --release --lib
cargo run --features "uniffi/cli uniffi-bindgen" --bin uniffi-bindgen generate --language swift --lib-file ../target/release/libyomikiri_rs.a --out-dir ./swift ./src/uniffi_yomikiri.udl

# build for ios and ios-simulator if required targets are installed

# check if rust target is installed
# https://users.rust-lang.org/t/determining-installed-target-list-when-rustup-is-not-in-use/100594/2
target_installed () {
  target="$1"
  sysroot="$(rustc --print sysroot)"
  if [ -d "$sysroot/lib/rustlib/$target" ]; then
    return 0
  else
    return 1
  fi
}

IOS_TARGET="aarch64-apple-ios"
IOS_SIM_TARGET="aarch64-apple-ios-sim"

if target_installed $IOS_TARGET; then
  echo "Building backend for ios"
  cargo build --release --lib --target $IOS_TARGET
else
  echo "Skipped building for ios because target 'aarch64-apple-ios' is not installed for rust"
fi
if target_installed $IOS_SIM_TARGET; then
echo "Building backend for ios simulator"
  cargo build --release --lib --target $IOS_SIM_TARGET
else
  echo echo "Skipped building for ios simulator because target 'aarch64-apple-ios-sim' is not installed for rust"
fi

# build wasm
wasm-pack build --scope yomikiri --target web
