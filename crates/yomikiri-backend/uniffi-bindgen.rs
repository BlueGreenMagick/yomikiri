fn main() {
    #[cfg(not(all(uniffi, feature = "uniffi-bindgen")))]
    eprintln!("uniffi-bindgen must be called on non-wasm target, with feature 'uniffi-bindgen'");

    #[cfg(all(uniffi, feature = "uniffi-bindgen"))]
    uniffi::uniffi_bindgen_main()
}
