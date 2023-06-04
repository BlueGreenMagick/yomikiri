use cfg_aliases::cfg_aliases;
use std::process::Command;

fn main() {
    set_env();
    cfg_aliases! {
      wasm: { target_family="wasm" },
      uniffi: { not(target_family="wasm") },
      anki: { all(not(target_family="wasm"), feature="uniffi-anki") },
      apple: { any(target_os="macos", target_os="ios") }
    }

    #[cfg(not(target_family = "wasm"))]
    {
        uniffi::generate_scaffolding("src/uniffi_yomikiri.udl").unwrap();
    }
}

fn set_env() {
    let output = Command::new("git")
        .args(&["rev-parse", "--short=8", "HEAD"])
        .output()
        .unwrap()
        .stdout;
    let out_string = String::from_utf8(output).unwrap();
    println!("cargo:rustc-env=BUILDHASH={}", out_string);
}
