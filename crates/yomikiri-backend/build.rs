use cfg_aliases::cfg_aliases;

fn main() {
    cfg_aliases! {
      wasm: { target_family="wasm" },
      apple: { any(target_os="macos", target_os="ios") }
    }
}
