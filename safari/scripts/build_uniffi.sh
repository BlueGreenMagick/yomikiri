# XCode tries to be helpful and overwrites the PATH. Reset that.
PATH="$(bash -l -c 'echo $PATH')"
PATH="/opt/homebrew/bin:$PATH"
PATH="/opt/homebrew/opt/node@16/bin:$PATH"

# If not called from XCode, (but called from terminal) current directory is the project dir.
PROJECT_DIR=${PROJECT_DIR:-'.'}

TARGET_DIR="$PROJECT_DIR/../target"

rm -rf $PROJECT_DIR/rust

# Copy files into extension
# if new swift binding files are added, they need to be added into XCode
CRATE_DIR="$PROJECT_DIR/../rust"
cp -RpL $CRATE_DIR/swift/. $PROJECT_DIR/rust

# Both iphone and ipad simulator
if [ "$PLATFORM_NAME" = "iphonesimulator" ]; then
  cp $TARGET_DIR/aarch64-apple-ios-sim/release/libyomikiri_rs.a "$PROJECT_DIR/rust/libyomikiri_rs.a"
else
  cp $TARGET_DIR/aarch64-apple-ios/release/libyomikiri_rs.a "$PROJECT_DIR/rust/libyomikiri_rs.a"
fi


