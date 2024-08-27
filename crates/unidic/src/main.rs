mod transform;

use crate::transform::transform;
use anyhow::Context;
use anyhow::Result;
use clap::Parser;
use fs_err::{self as fs, File};
use lindera_core::dictionary_builder::DictionaryBuilder;
use lindera_unidic_builder::unidic_builder::UnidicBuilder;
use std::ffi::OsString;
use std::path::Path;
use std::path::PathBuf;
use zip::ZipArchive;

/// Transform and build unidic files to be used for Yomikiri
#[derive(Parser, Debug)]
struct UnidicOpts {
    /// Path to directory that stores original unidic files
    #[arg(short, long)]
    unidic_dir: PathBuf,
    /// Path to directory that stores transformed unidic files for lindera
    #[arg(short, long)]
    transform_dir: PathBuf,
    /// Path to directory that stores built unidic files for lindera
    #[arg(short, long)]
    output_dir: PathBuf,
    /// Path to directory that holds `english.yomikiridict` file
    #[arg(short, long)]
    resource_dir: PathBuf,
    /// By default, unidic files are downloaded into `--unidic-dir`
    /// only if it the directory is empty,
    /// otherwise uses the files already in the directory.
    ///
    /// Specifying this option force re-downloads fresh unidic files instead.
    #[arg(long, default_value_t = false)]
    redownload: bool,
    /// Delete all files in directory before writing files
    #[arg(short, long, default_value_t = false)]
    clean: bool,
}

fn main() -> Result<()> {
    let opts = UnidicOpts::parse();

    let output_dir = opts.output_dir;
    let transform_dir = opts.transform_dir;
    let original_dir = opts.unidic_dir;
    let resource_dir = opts.resource_dir;

    let original_dir_exists = original_dir.try_exists()?;
    if opts.redownload
        || !original_dir_exists
        || !fs::read_dir(&original_dir)?
            .any(|e| e.map(|p| valid_file_name(&p.file_name())).unwrap_or(false))
    {
        if opts.clean && original_dir_exists {
            fs::remove_dir_all(&original_dir)?;
        }
        fs::create_dir_all(&original_dir)?;
        download_unidic_original(&original_dir)?;
    }

    if opts.clean {
        if transform_dir.try_exists()? {
            fs::remove_dir_all(&transform_dir)?;
        }
        if output_dir.try_exists()? {
            fs::remove_dir_all(&output_dir)?;
        }
    }

    fs::create_dir_all(&transform_dir)?;
    fs::create_dir_all(&output_dir)?;

    println!("Transforming unidic for Yomikiri...");
    transform(&original_dir, &transform_dir, &resource_dir)
        .context("Failed to transform unidic file")?;

    println!("Building unidic lindera files...");
    let builder = UnidicBuilder::new();
    builder
        .build_dictionary(&transform_dir, &output_dir)
        .context("Failed to build unidic")?;
    Ok(())
}

/// Return `false` for hidden files or `thumbs.db`
fn valid_file_name(name: &OsString) -> bool {
    if let Some(name) = name.to_str() {
        if name.starts_with('.') || name.to_lowercase() == "thumbs.db" {
            return false;
        }
    }
    true
}

/// download and unzip unidic file into `output_path`.
/// `output_path` must exist and be a directory
fn download_unidic_original(output_path: &Path) -> Result<()> {
    let download_url =
        "https://github.com/BlueGreenMagick/yomikiri/releases/download/unidic-2.1.2-kana-accent/unidic-2.1.2-kana-accent-2.1.2.zip";
    println!("Downloading unidic from \"{}\"", &download_url);
    let resp = ureq::get(download_url).call()?;
    let mut tmpfile = tempfile::tempfile()?;
    std::io::copy(&mut resp.into_reader(), &mut tmpfile)
        .context("Could not write response body into tempfile")?;

    // unzip files
    let mut archive = ZipArchive::new(tmpfile)?;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let file_name =
            file.enclosed_name()
                .and_then(|p| if p.is_dir() { None } else { p.file_name() });
        let Some(file_name) = file_name else { continue };
        let Some(file_name) = file_name.to_str() else {
            continue;
        };
        // skip large files that aren't used
        if ["matrix.bin", "model.bin", "model.def", "sys.dic"].contains(&file_name) {
            continue;
        }

        let dest_path = output_path.join(file_name);
        let mut dest = File::create(&dest_path)?;
        std::io::copy(&mut file, &mut dest).context("Could not copy tempfile into destination")?;
    }
    Ok(())
}
