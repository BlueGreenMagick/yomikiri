use std::error::Error;

#[cfg(feature = "real")]
fn main() -> Result<(), Box<dyn Error>> {
    use std::env;
    use std::path::PathBuf;
    use yomikiri_unidic_build::build_unidic;

    let manifest_dir = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    println!("{:?}", &manifest_dir);
    let input_dir = manifest_dir.join("original");
    let transform_dir = manifest_dir.join("transformed");
    let output_dir = manifest_dir.join("output");

    // rerun-if-changed reruns when only target changes as well.
    // TODO: don't rerun if only target has changed
    build_unidic(&input_dir, &transform_dir, &output_dir)
}

#[cfg(not(feature = "real"))]
fn main() {}
