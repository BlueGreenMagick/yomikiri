fn main() {
    #[cfg(not(uniffi))]
    eprintln!("uniffi-bindgen must be called on non-wasm target.");

    #[cfg(uniffi)]
    uniffi::uniffi_bindgen_main()
}
