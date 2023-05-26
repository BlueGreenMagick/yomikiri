use std::process::Command;

fn main() {
    set_env();
    uniffi::generate_scaffolding("src/uniffi_anki.udl").unwrap();
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
