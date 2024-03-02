rm -rf ./swift
rm -rf ./pkg

FILE_PATH=$(realpath $0)
PROJECT_DIR=$(dirname $FILE_PATH)

cd "$PROJECT_DIR"

# build unidic
cargo run --manifest-path "../unidic/Cargo.toml"

# build uniffi

cargo build --release --lib
cargo run --features "uniffi/cli uniffi-bindgen" --bin uniffi-bindgen generate --language swift --lib-file ../target/release/libyomikiri_rs.a --out-dir ./swift ./src/uniffi_yomikiri.udl

cargo build --release --lib --target "aarch64-apple-ios"
cargo build --release --lib --target "aarch64-apple-ios-sim"

# build wasm
wasm-pack build --scope yomikiri --target web
