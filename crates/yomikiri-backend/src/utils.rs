#[cfg(feature = "wasm")]
pub fn set_panic_hook() {
    console_error_panic_hook::set_once();
}

#[cfg(feature = "wasm")]
pub fn setup_logger() {
    wasm_logger::init(wasm_logger::Config::default());
}

#[cfg(not(feature = "wasm"))]
pub fn setup_logger() {
    eprintln!("No logger configurable for targets not wasm nor apple")
}
