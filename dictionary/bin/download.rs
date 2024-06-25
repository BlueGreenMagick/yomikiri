use std::env;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::NamedTempFile;

const TAG: &'static str = "jmdict-jun-25";

type Result<T> = std::result::Result<T, Box<dyn Error>>;

fn main() -> Result<()> {
    let crate_dir = env::var_os("CARGO_MANIFEST_DIR").ok_or(
        "CARGO_MANIFEST_DIR env var not found. Are you not running the program with `cargo run`?",
    )?;
    let crate_dir = PathBuf::from(crate_dir);
    let resources_dir = crate_dir.join("res");

    std::fs::create_dir_all(&resources_dir)?;

    let download_url_base = format!(
        "https://github.com/BlueGreenMagick/yomikiri/releases/download/{}/",
        TAG
    );
    let filenames = [
        "english.yomikiridict",
        "english.yomikiriindex",
        "dictionary-metadata.json",
    ];
    let tag_file_path = resources_dir.join("TAG");

    if matches_tag(&tag_file_path)? {
        println!("Yomikiri dictionary files are already downloaded.");
        return Ok(());
    }

    for filename in filenames {
        let file_path = resources_dir.join(filename);
        let _ = fs::remove_file(&file_path);
        let mut url = download_url_base.to_string();
        url.push_str(filename);
        println!("Downloading '{}' from {}", filename, url);
        download_file(&url, &file_path)?;
    }

    fs::write(tag_file_path, TAG)?;

    Ok(())
}

fn matches_tag(tag_file_path: &Path) -> Result<bool> {
    if !tag_file_path.exists() {
        return Ok(false);
    }

    let content = fs::read_to_string(tag_file_path)?;
    Ok(content == TAG)
}

fn download_file(url: &str, output_path: &Path) -> Result<()> {
    let output_dir = output_path
        .parent()
        .ok_or("output_path does not have a parent directory.")?;
    let resp = ureq::get(url).call()?;
    let mut reader = resp.into_reader();
    let mut tmpfile = NamedTempFile::new_in(output_dir)?;
    std::io::copy(&mut reader, &mut tmpfile)?;
    tmpfile.persist(output_path)?;
    Ok(())
}
