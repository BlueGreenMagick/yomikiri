# XCode tries to be helpful and overwrites the PATH. Reset that.
PATH="$(bash -l -c 'echo $PATH')"
PATH="/opt/homebrew/bin:$PATH"
PATH="/opt/homebrew/opt/node@16/bin:$PATH"

# If not called from XCode, (but called from terminal) current directory is the project dir.
PROJECT_DIR=${PROJECT_DIR:-'.'}

TARGET_DIR="$PROJECT_DIR/../target"

rm -rf $PROJECT_DIR/rust

# lindera
LINDERA_CRATE_DIR="$PROJECT_DIR/../tokenizer/lindera-wasm"
cp -RpL $LINDERA_CRATE_DIR/ios/. $PROJECT_DIR/rust
cp $TARGET_DIR/aarch64-apple-ios/release/liblindera_wasm.a "$PROJECT_DIR/rust/liblindera.a"
cp $TARGET_DIR/aarch64-apple-ios-sim/release/liblindera_wasm.a "$PROJECT_DIR/rust/liblindera_sim.a"

# anki_rs
ANKI_CRATE_DIR="$PROJECT_DIR/../anki_rs"
cp -RpL $ANKI_CRATE_DIR/ios/. $PROJECT_DIR/rust
cp $TARGET_DIR/aarch64-apple-ios/release/libanki_rs.a "$PROJECT_DIR/rust/libanki_rs.a"
cp $TARGET_DIR/aarch64-apple-ios-sim/release/libanki_rs.a "$PROJECT_DIR/rust/libanki_rs_sim.a"