use std::process::Command;

fn main() {
    let output = Command::new("git")
        .args(&["rev-parse", "--short=8", "HEAD"])
        .output()
        .unwrap()
        .stdout;
    let out_string = String::from_utf8(output).unwrap();
    println!("cargo:rustc-env=BUILDHASH={}", out_string);
}
