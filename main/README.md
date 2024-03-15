### Development

**Building required files**
You only need to do this once.
1. Go to `/dictionary`, download JMDict_e from web and run `cargo run -- "./resources/JMdict_e" "./resources/english.yomikiridict" "./resources/english.yomikiriindex"`.
2. Go to `/rust` and run `./build.sh`.

**Chrome**

1. Run `pnpm dev`
2. Add `build/chrome` directory as extension. ([Chrome](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked))

**Firefox**

1. Run `pnpm dev:firefox`
2. Go to `about:debugging` > `This firefox`
3. Click `Load Temporary Add-on` and add `build/firefox/manifest.json`

### Structure

'assets/static' directory stores assets that has to be copied into build.
Other assets in 'assets' directory are 'imported' by code.

### Minimum Target

ios 15.1: web extension memory limit increased to 80MB ([source](https://developer.apple.com/forums/thread/687642))
ios 15.4 (2022 Mar): declarative_net_request redirect rule supported ([source](https://developer.apple.com/documentation/safariservices/safari_web_extensions/blocking_content_with_your_safari_web_extension))
chrome 88: manifest v3
chrome 99 (2022 Mar): await on some extension functions fixed
firefox 45: manifest v2
firefox 55 (2017 Aug): runtime.onInstalled
firefox 79: WeakRef
-firefox 109 (2023 Jan): manifest v3
safari 14: manifest v2
safari 14.1 (2021 Apr): background.persistant, WeakRef
-safari 15.4 (2022 Mar): manifest v3 (better supported)
