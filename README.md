# About

Yomikiri is a Japanese immersion learning tool. As you browse the internet and encounter words you don't know, you can look up the word definitions with Yomikiri and add the word to Anki flashcards.

Yomikiri is available for Chrome, Firefox, and iOS.

## Features
- View definition for hovered word
- Recognizes word boundary within sentence
- Recognizes conjugation forms of verbs or adjectives
- Add word to Anki

## Building from source

Please note that we do not support building the project on Windows. You may want to use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) to build the project.

[NodeJS](https://nodejs.org/en/download), [pnpm](https://pnpm.io/installation), [Rust/cargo](https://www.rust-lang.org/tools/install), [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/) must be installed.

Run the following commands in order:
```sh
# install dependencies
pnpm install --frozen-lockfile
# install JMDict dictionary file
pnpm run prepare:dictionary
# install unidic tokenizer dictionary files
pnpm run prepare:unidic
# build rust backend binary
pnpm run prepare:backend
```

To build for ios as well, add ios target to rust: 
`rustup target add aarch64-apple-ios`, `rustup target add aarch64-apple-ios-sim`,
then run `pnpm run prepare:backend`.

### Chrome

Run `pnpm build:chrome`.

In Chrome, go to `chrome://extensions/`, toggle developer mode. Press 'Load unpacked' and open `/main/build/chrome`.

### Firefox

Run `pnpm build:firefox`.

In Firefox, type `about:debugging` in the url bar to open debugging menu. Switch to 'This Firefox' tab. 
Press 'Load Temporary Add-on...' and open `/main/build/firefox/manifest.json`.

## Ios

Open `/safari/Yomikiri.xcodeproj` on XCode.