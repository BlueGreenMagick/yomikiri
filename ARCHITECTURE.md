`/main`: Contains the main frontend code.

- `/main/src/iosapp`: Code for ios app webview.
- `/main/src/extension`: Code used in extension context. Code outside this directory are considered code that can also be called in `iosapp` and should not import code in this directory.
  Each subdirectories are different entry points.
- `/main/src/platform`: Platform-specific code.
- `/main/src/assets/static`: Assets that have to be manually copied into bundle (with esbuild plugin). Assets not in `static` directories are automatically bundled by esbuild if they are imported into the code.

`/rust`: Main backend code that 1) tokenize Japanese text 2) search dictionary entry 3) update dictionary files
`/dictionary`: Creates Yomikiri dictionary files.
`/jmdict`: Parses JMDict dictionary files.
`/unidic`: Transforms and builds unidic tokenizer dictionary files.
`/unidic-types`: Used to serialize unidic entries in a more compact form.
`/safari`: Code for iOS, iPadOS (and maybe macOS)
`/extra/generate-license`: Collects license details from the project's pnpm and cargo dependencies.
`/extra/tokenizers`: Code used to compare and experiment with different tokenizers for potential use in Yomikiri.
