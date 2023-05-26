rm -rf ./ios

cargo build --release --lib
cargo run --features "uniffi-bindgen" --bin uniffi-bindgen generate --language swift --lib-file ../target/release/libanki_rs.a --out-dir ./ios ./src/uniffi_anki.udl

cargo build --release --lib --target "aarch64-apple-ios"
cargo build --release --lib --target "aarch64-apple-ios-sim"