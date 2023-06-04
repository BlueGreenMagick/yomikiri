You must run `./build.sh` in '/rust' before building.

After editing rust library, run build to get accurate type analysis in XCode.

Added build phase when building for web extensions(univ.) to run `scripts/copy_extension_files.sh`

### UniFFI rust
1. Run `scripts/build_uniffi.sh` before compiling sources, in build phases for ios extension.

2. Check that `libyomikiri_rs.a` is added to 'link binary with libraries' in build phase for ios extension.

3. Created `Bridging-Header.h` with content
```h
#ifndef Bridging_Header_h
#define Bridging_Header_h

#import "uniffi_yomikiriFFI.h"

#endif /* Bridging_Header_h */
```

4. Add `Bridging-Header.h ` to `Build Settings > Objective-C Bridging Header`

5. run build, then on error, add all files in 'rust' folder to project in XCode.

### Principal class

Changed `NSExtensionPrincipalClass` in Info.plist to IOSWebExtensionHandler for ios web extension, and `MacWebExtensionHandler` for mac

### App groups

Added `group.com.bluegreenmagick.yomikiri` app group to ios app and ios extension.

### Custom url scheme

Added URL types to ios app, to implement `yomikiri` url scheme