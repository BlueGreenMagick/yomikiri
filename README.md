## About

Yomikiri is a Japanese immersion learning tool. As you browse the internet and encounter words you don't know, you can look up the word definitions with Yomikiri and add the word to Anki flashcards. It is a spiritual successor to [Yomichan](https://github.com/FooSoft/yomichan) with easier usage.

Yomikiri is available for Chrome, Firefox, and iOS.

## Features
- View definition for hovered word
- Separates words in sentence
- Add note to Anki

## Installation

[NodeJS](https://nodejs.org/en/download), [yarn](https://classic.yarnpkg.com/lang/en/docs/install), [Rust, cargo](https://www.rust-lang.org/tools/install), [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) must be installed.

Go to `/dictionary` and run `cargo run` to create dictionary files.

Go to `/rust` and run `wasm-pack build --scope yomikiri --target web` to build Yomikiri wasm backend.

### Chrome

Go to `/extension`. Run `yarn build:chrome`.

In Chrome, go to `chrome://extensions/`, toggle developer mode. Press 'Load unpacked' and open `/extension/build/chrome`.

### Firefox

Go to `/extension`. Run `yarn build:firefox`.

In Firefox, type `about:debugging` in the url bar to open debugging menu. Switch to 'This Firefox' tab. Press 'Load Temporary Add-on...' and open `/extension/build/firefox/manifest.json`.
