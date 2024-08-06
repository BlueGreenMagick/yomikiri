# Yomikiri

Yomikiri is a Japanese immersion learning tool. As you read Japanese text and encounter words you don't know, look up the meaning and add the word to Anki flashcards.

Yomikiri is available for Chrome, Firefox, and iOS.

<div>
<a href="https://chromewebstore.google.com/detail/iecicegmfmljmefcaknlkaaniemghefc"><img alt="Available in the Chrome Web Store" src="https://i.imgur.com/Mw6ip7o.png" height="48"/></img></a>  
<a href="https://addons.mozilla.org/en-US/firefox/addon/yomikiri"><img alt="Get the add-on for Firefox" src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" height="48"></img></a>
<a href="https://apps.apple.com/us/app/yomikiri/id6479743831"><img alt="Download on the App Store" src="https://i.imgur.com/nRP4dWp.png" height="48"></img></a>
</div>

## Features

- Shift + Hover over a word to view definition. It recognizes word boundaries within sentence.
  <img src="./extra/resources/screenshots/desktop-tooltip.jpg?raw=true" height="240"/>

- Search words and sentences in popup.
  <img src="./extra/resources/screenshots/desktop-popup.jpg?raw=true" height="240"/>

- Add word to Anki. You can preview and edit the note before adding.\
  If Anki is not running, notes are stored and automatically added later. You don't have to keep Anki running in the background all the time.
  <img src="./extra/resources/screenshots/desktop-tooltip-anki.jpg?raw=true" height="240"/>

- Customizable Anki note template.
  <img src="./extra/resources/screenshots/desktop-anki-configuration.jpg?raw=true" height="240"/>

- View sentence translation.
- View relevant grammar with a link to Tofugu.

## Building from source

Please note that we do not support building the project on Windows. You may want to use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) to build the project. The build system has only been tested on MacOS 14 (ARM) however, and may not quite work on Linux.

[NodeJS](https://nodejs.org/en/download), [pnpm](https://pnpm.io/installation), [Rust & cargo](https://www.rust-lang.org/tools/install), [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) must be installed.

Run the following commands

```sh
# Downloads and builds JMDict and UniDic dictionary files
pnpm run construct:web
# install node dependencies
pnpm install
pnpm generate-licenses
```

To build for ios as well, add ios target to rust:
`rustup target add aarch64-apple-ios`, `rustup target add aarch64-apple-ios-sim`,
and run `pnpm run construct:all`.

### Chrome

Run `pnpm dev:chrome` or `pnpm build:chrome`.

In Chrome, go to `chrome://extensions/`, toggle developer mode. Press 'Load unpacked' and open `/main/build/chrome`.

### Firefox

Run `pnpm dev:firefox` or `pnpm build:firefox`.

In Firefox, type `about:debugging` in the url bar to open debugging menu. Switch to 'This Firefox' tab.
Press 'Load Temporary Add-on...' and open `/main/build/firefox/manifest.json`.

## Ios

Open `/safari/Yomikiri.xcodeproj` on XCode.
