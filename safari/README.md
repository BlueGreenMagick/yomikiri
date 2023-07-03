You must run `./build.sh` in '/rust' before building.

After editing rust library, run build to get accurate type analysis in XCode.

### UniFFI rust & tokenizer framework

1. Add yomikiri-tokenizer to framework in ios app and ios extension.

2. Run `scripts/build_uniffi.sh` before compiling sources, in build phases for tokenizer framework.

3. Add `rust` files to tokenizer framework (run build, and after error)

4. In build phase for framework, check that `libyomikiri_rs.a` is added to 'link binary with libraries', 'uniffi_yomikiriFFI.h' to 'headers'.

5. Add `Bridging-Header.h`, set it up in tokenizer framework's `Build Settings > Objective-C Bridging Header`

### Extension files

1. During build phase, `scripts/build_extension.sh` is run which runs `yarn build` on extension

2. `manifest.json` and `res` folder is bundled into extension during build phase

### Principal class

Changed `NSExtensionPrincipalClass` in Info.plist to IOSWebExtensionHandler for ios web extension, and `MacWebExtensionHandler` for mac

### App groups

Added `group.com.bluegreenmagick.yomikiri` app group to ios app and ios extension.

### Custom url scheme

Added URL types to ios app, to implement `yomikiri` url scheme
