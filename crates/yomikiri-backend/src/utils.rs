#[cfg(wasm)]
pub fn set_panic_hook() {
    console_error_panic_hook::set_once();
}

#[cfg(wasm)]
pub fn setup_logger() {
    wasm_logger::init(wasm_logger::Config::default());
}

#[cfg(not(any(wasm, apple)))]
pub fn setup_logger() {
    eprintln!("No logger configurable for targets not wasm nor apple")
}

#[cfg(wasm)]
#[allow(dead_code)]
pub(crate) fn time_now() -> f64 {
    let window = web_sys::window().unwrap();
    window.performance().unwrap().now()
}
