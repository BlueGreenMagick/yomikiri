Building for web extensions(ios and mac) run `scripts/copy_extension_files.sh` in build phase.

### UniFFI rust
1. Run `scripts/build_uniffi.sh` before compiling sources, in build phases for ios extension.
2. Added to `Build Settings > Other Linker flags` for ios extension:

For any ios simulator: `-XLinker $(PROJECT_DIR)/rust/liblindera_sim.a`
For any ios: `-XLinker $(PROJECT_DIR)/rust/liblindera.a`

3. Removed from 'link binary with libraries' in build phase for ios extension.

4. Created `Bridging-Header.h`

5. Add `Bridging-Header.h ` to `Build Settings > Objective-C Bridging Header`

Cleaned build folder

### Principal class

Changed `NSExtensionPrincipalClass` in Info.plist to IOSWebExtensionHandler for ios web extension, and MacWebExtensionHandler for mac