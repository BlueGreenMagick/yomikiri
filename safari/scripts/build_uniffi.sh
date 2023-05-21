# XCode tries to be helpful and overwrites the PATH. Reset that.
PATH="$(bash -l -c 'echo $PATH')"
PATH="/opt/homebrew/bin:$PATH"
PATH="/opt/homebrew/opt/node@16/bin:$PATH"

# If not called from XCode, (but called from terminal) current directory is the project dir.
PROJECT_DIR=${PROJECT_DIR:-'.'}

TARGET_DIR="$PROJECT_DIR/../target"
CRATE_DIR="$PROJECT_DIR/../tokenizer/lindera-wasm"
MANIFEST_PATH="$CRATE_DIR/Cargo.toml"

cargo build --no-default-features --features uniffi --target aarch64-apple-ios --release --lib --manifest-path "$MANIFEST_PATH"
cargo build --no-default-features --features uniffi --target aarch64-apple-ios-sim --release --lib --manifest-path "$MANIFEST_PATH"

cargo run --no-default-features --features uniffi --manifest-path "$MANIFEST_PATH" --bin uniffi-bindgen generate --language swift --lib-file "$TARGET_DIR/aarch64-apple-ios/release/liblindera_wasm.a" --out-dir "$PROJECT_DIR/rust" "$CRATE_DIR/src/uniffi_lindera.udl"

mv $TARGET_DIR/aarch64-apple-ios/release/liblindera_wasm.a "$PROJECT_DIR/rust/liblindera.a"
mv $TARGET_DIR/aarch64-apple-ios-sim/release/liblindera_wasm.a "$PROJECT_DIR/rust/liblindera_sim.a"
