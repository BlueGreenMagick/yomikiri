# About

Yomikiri is a Japanese immersion learning tool. As you browse the internet and encounter words you don't know, you can look up the word definitions with Yomikiri and add the word to Anki flashcards.

Yomikiri is available for Chrome, Firefox, and iOS.

<a href="https://chromewebstore.google.com/detail/iecicegmfmljmefcaknlkaaniemghefc"><img alt="Get it on Google Chrome" src="https://i.imgur.com/Mw6ip7o.png" height="36px"/></img></a>  (Firefox and iOS app is coming soon!)

## Features
- View definition for hovered word
- Recognizes word boundary within sentence
- Recognizes conjugation forms of verbs or adjectives
- View translation for sentence.
- View relevant grammar with a link to Tofugu.
- Add word to Anki. You can preview and edit the note before adding.
- Search and view how a sentence is structured
- IOS app + integration with AnkiMobile. (Coming soon!)

## Building from source

Please note that we do not support building the project on Windows. You may want to use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) to build the project.

[NodeJS](https://nodejs.org/en/download), [pnpm](https://pnpm.io/installation), [Rust/cargo](https://www.rust-lang.org/tools/install), [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) must be installed.

Run the following commands
```sh
# install node dependencies
# Optionally, use --frozen-lockfile to build identical software
pnpm install
# Downloads and builds JMDict and UniDic dictionary files,
# so it will take a long time to run.
pnpm run construct:web
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