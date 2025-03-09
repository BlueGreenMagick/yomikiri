fn main() {
    #[cfg(not(feature = "uniffi-bindgen"))]
    eprintln!("Invalid invocation: Call uniffi-bindgen through taskfile.");

    #[cfg(feature = "uniffi-bindgen")]
    uniffi::uniffi_bindgen_main()
}
