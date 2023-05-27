fn main() {
    #[cfg(not(all(not(target_family = "wasm"), feature = "uniffi/cli")))]
    eprintln!(
        "uniffi-bindgen must be called on non-wasm target, and with 'uniffi/cli' feature enabled."
    );

    #[cfg(all(not(target_family = "wasm"), feature = "uniffi/cli"))]
    uniffi::uniffi_bindgen_main()
}
