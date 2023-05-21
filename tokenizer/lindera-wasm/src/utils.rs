#[cfg(feature = "uniffi")]
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(feature = "wasm")]
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

#[cfg(feature = "wasm")]
macro_rules! log {
    ($($t:tt)*) => (web_sys::console::log_1(&format_args!($($t)*).to_string().into()))
}

#[cfg(feature = "uniffi")]
macro_rules! log {
    ($($t:tt)*) => (println!($($t)*))
}

pub(crate) use log;

#[cfg(feature = "wasm")]
pub(crate) fn time_now() -> f64 {
    let window = web_sys::window().unwrap();
    window.performance().unwrap().now()
}

#[cfg(feature = "uniffi")]
pub(crate) fn time_now() -> f64 {
    let micro = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_micros();
    (micro as f64) / 1000.0
}
