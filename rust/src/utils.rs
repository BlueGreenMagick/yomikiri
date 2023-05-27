#[cfg(uniffi)]
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(wasm)]
pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[cfg(wasm)]
pub fn setup_logger() {
    wasm_logger::init(wasm_logger::Config::default());
}

#[cfg(apple)]
pub fn setup_logger() {
    let logger = oslog::OsLogger::new("com.yoonchae.Yomikiri.Extension")
        .level_filter(log::LevelFilter::Debug);
    if logger.init().is_err() {
        log::warn!("os_log was already initialized");
    }
}

#[cfg(not(any(wasm, apple)))]
pub fn setup_logger() {
    eprintln!("No logger configurable for targets not wasm nor apple")
}

#[cfg(wasm)]
pub(crate) fn time_now() -> f64 {
    let window = web_sys::window().unwrap();
    window.performance().unwrap().now()
}

#[cfg(uniffi)]
pub(crate) fn time_now() -> f64 {
    let micro = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_micros();
    (micro as f64) / 1000.0
}
