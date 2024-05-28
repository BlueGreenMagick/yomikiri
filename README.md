<p align="center">
<img src="./extra/resources/github-splash.png" alt="yomikiri"/>
</p>

# Yomikiri

Yomikiri is a Japanese immersion learning tool. As you browse the internet and encounter words you don't know, you can look up the word definitions with Yomikiri and add the word to Anki flashcards.

Yomikiri is available for Chrome, Firefox, and iOS.

<div>
<a href="https://chromewebstore.google.com/detail/iecicegmfmljmefcaknlkaaniemghefc"><img alt="Available in the Chrome Web Store" src="https://i.imgur.com/Mw6ip7o.png" height="48"/></img></a>  
<a href="https://apps.apple.com/us/app/yomikiri/id6479743831"><img alt="Download on the App Store" src="https://i.imgur.com/nRP4dWp.png" height="48"></img></a>
</div>

(Firefox is coming soon!)

## Features

<img src="./extra/resources/screenshot1.png?raw=true" style="max-height: 300px;"/>

- View definition for hovered word
- Recognizes word boundary within sentence
- Recognizes conjugation forms of verbs or adjectives
- View translation for sentence.
- View relevant grammar with a link to Tofugu.
- Add word to Anki. You can preview and edit the note before adding.
- Search and view how a sentence is structured

## Building from source

Please note that we do not support building the project on Windows. You may want to use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) to build the project.

[NodeJS](https://nodejs.org/en/download), [pnpm](https://pnpm.io/installation), [Rust & cargo](https://www.rust-lang.org/tools/install), [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) must be installed.

Run the following commands

```sh
# Downloads and builds JMDict and UniDic dictionary files,
# so it will take a long time to run.
pnpm run construct:web
# install node dependencies
# Optionally, use --frozen-lockfile to build identical software
pnpm install
pnpm generate-licenses
```

To build for ios as well, add ios target to rust:
`rustup target add aarch64-apple-ios`, `rustup target add aarch64-apple-ios-sim`,
and run `pnpm run construct:all`.

### Chrome

Run `pnpm dev:chrome`.

In Chrome, go to `chrome://extensions/`, toggle developer mode. Press 'Load unpacked' and open `/main/build/chrome`.

### Firefox

Run `pnpm dev:firefox`.

In Firefox, type `about:debugging` in the url bar to open debugging menu. Switch to 'This Firefox' tab.
Press 'Load Temporary Add-on...' and open `/main/build/firefox/manifest.json`.

## Ios

Open `/safari/Yomikiri.xcodeproj` on XCode.
