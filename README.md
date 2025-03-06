# Yomikiri

Yomikiri is a Japanese immersion learning tool. As you read Japanese text and encounter words you don't know, look up the meaning and add the word to Anki flashcards.

Yomikiri is available for Chrome, Firefox, and iOS.

<div>
<a href="https://chromewebstore.google.com/detail/iecicegmfmljmefcaknlkaaniemghefc"><img alt="Available in the Chrome Web Store" src="https://i.imgur.com/Mw6ip7o.png" height="48"/></img></a>  
<a href="https://addons.mozilla.org/en-US/firefox/addon/yomikiri"><img alt="Get the add-on for Firefox" src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" height="48"></img></a>
<a href="https://apps.apple.com/us/app/yomikiri/id6479743831"><img alt="Download on the App Store" src="https://i.imgur.com/nRP4dWp.png" height="48"></img></a>
</div>

## Features

- Shift + Hover over a word to view definition. It recognizes word boundaries within sentence.\
  <img src="./extra/resources/screenshots/desktop-tooltip.jpg?raw=true" height="240"/>

- Search words and sentences in popup.\
  <img src="./extra/resources/screenshots/desktop-popup.jpg?raw=true" height="240"/>

- Add word to Anki. You can preview and edit the note before adding.\
  If Anki is not running, notes are stored and automatically added later. You don't have to keep Anki running in the background all the time.\
  <img src="./extra/resources/screenshots/desktop-tooltip-anki.jpg?raw=true" height="240"/>

- Customizable Anki note template.\
  <img src="./extra/resources/screenshots/desktop-anki-configuration.jpg?raw=true" height="240"/>

- View sentence translation.
- View relevant grammar with a link to Tofugu.

## Building from source

Please note that we do not support building the project on Windows. You may want to use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) to build the project. The build system has only been tested on MacOS 14 (ARM) however, and may not quite work on Linux.

[NodeJS](https://nodejs.org/en/download), [pnpm](https://pnpm.io/installation), [Rust & cargo](https://www.rust-lang.org/tools/install), [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/), [Taskfile](https://taskfile.dev/installation) must be installed.

To build for all targets, run the following commands. If you only need to build for desktop browser extension, go to later section instead.

```sh
# Install Taskfile if not already installed.
npm install -g @go-task/cli
# install node dependencies
pnpm install
# Build chrome, firefox web extensions, and get mostly there with the ios app
task build:extensions
```

The desktop browser extensions are built into `/main/build/`.

To build for ios,
```sh
# Add target to compile rust for ios
rustup target add aarch64-apple-ios
```

Then open `/safari/Yomikiri.xcodeproj` on XCode, and build.

## Development

Run `task dev` to develop on Chrome.
```sh
task dev
```

After modification, run `task format` to fix formatting, `task lint` to check for lint errors, and `task test` to run tests. These commands are universal, and are defined in repo root, and all sub packages and crates where relevant.

### Chrome

Run `task dev:chrome`.

In Chrome, go to `chrome://extensions/`, toggle developer mode. Press 'Load unpacked' and open `/main/build/chrome`.

### Firefox

Run `task dev:firefox`.

In Firefox, type `about:debugging` in the url bar to open debugging menu. Switch to 'This Firefox' tab.
Press 'Load Temporary Add-on...' and open `/main/build/firefox/manifest.json`.

### IOS

Add the relevant targets:
```sh
# Add target to compile rust for ios
rustup target add aarch64-apple-ios
# (Optional) If you want to build for ios simulator, add below target
rustup target add aarch64-apple-ios-sim
```

Open `/safari/Yomikiri.xcodeproj` on XCode, and build. 
Building automatically builds rust crates and bundles web files in `./main`.
