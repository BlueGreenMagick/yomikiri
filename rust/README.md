Run `build.sh` after you edit the code.
Increment ios framework version in XCode > framework > Build settings > Versioning.

For development, I recommend setting `.vscode/settings.json` to the following, and open this crate as root. This lets rust-analyzer analyze both uniffi and wasm code.

```json5
{
  "rust-analyzer.check.overrideCommand": [
    "cargo",
    "check",
    "--target",
    "wasm32-unknown-unknown",
    "--target",
    "aarch64-apple-ios",
    "-p",
    "yomikiri-rs",
    "--message-format=json"
  ]
}
```