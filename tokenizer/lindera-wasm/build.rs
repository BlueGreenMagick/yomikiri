fn main() {
    #[cfg(feature = "uniffi")]
    uniffi::generate_scaffolding("src/uniffi_lindera.udl").unwrap();
}
