`/main`: Contains the main frontend code.

- `/main/src/iosapp`: Code for ios app webview.
- `/main/src/extension`: Code used in extension context. Code outside this directory are considered code that can also be called in `iosapp` and should not import code in this directory.
  Each subdirectories are different entry points.
- `/main/src/platform`: Platform-specific code.
- `/main/src/assets/static`: Assets that have to be manually copied into bundle (with esbuild plugin). Assets not in `static` directories are automatically bundled by esbuild if they are imported into the code.


`/crates`: Rust crates
- `yomikiri-backend`: Main backend binary. Compiled into wasm for web, static library for ios.
- `jmdict`: A library that parses JMDict XML.
- `unidic`: Binary that downloads, transforms, and builds unidic tokenizer dictionary files.
- `unidic-types`: Used to parse and serialize unidic entries in a more compact form.
- `yomikiri-dictionary`: Reads and writes yomikiri dictionary format.
- `yomikiri-dictionary-generator`: Binary that downlaods JMDict xml and builds yomikiri dictionary files.

`/safari`: Code for iOS, iPadOS (and maybe macOS)
`/extra/generate-license`: Collects license details from the project's pnpm and cargo dependencies.
`/extra/tokenizers`: Code used to compare and experiment with different tokenizers for potential use in Yomikiri.
