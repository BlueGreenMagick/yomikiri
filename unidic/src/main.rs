mod transform;

use crate::transform::transform;
use filetime::set_file_mtime;
use filetime::FileTime;
use lindera_core::dictionary_builder::DictionaryBuilder;
use lindera_unidic_builder::unidic_builder::UnidicBuilder;
use std::env;
use std::error::Error;
use std::fs;
use std::fs::File;
use std::path::Path;
use std::path::PathBuf;
use std::time::SystemTime;
use walkdir::{DirEntry, WalkDir};
use zip::ZipArchive;

fn main() -> Result<(), Box<dyn Error>> {
    let crate_dir = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let original_dir = crate_dir.join("original");
    let transform_dir = crate_dir.join("transformed");
    let output_dir = crate_dir.join("output");
    let src_dir = crate_dir.join("src");
    let resource_dir = crate_dir.join("../dictionary/resources");

    if !output_dir.try_exists()? {
        std::fs::create_dir(&output_dir)?;
    }
    if !transform_dir.try_exists()? {
        std::fs::create_dir(&transform_dir)?;
    }
    if !original_dir.try_exists()? {
        std::fs::create_dir(&original_dir)?;
    }
    // download original unidic if 'original' dir is empty
    if WalkDir::new(&original_dir)
        .into_iter()
        .filter_entry(|e| !skip_file_entry(e))
        .skip(1) // first entry is the directory
        .next()
        .is_none()
    {
        download_unidic_original(&original_dir)?;
    }

    let original_mtime = get_last_mtime_of_dir(&original_dir)?;
    let transform_mtime = get_last_mtime_of_dir(&transform_dir)?;
    let src_mtime = get_last_mtime_of_dir(&src_dir)?;
    let resource_mtime = get_last_mtime_of_dir(&resource_dir)?;
    let manifest_mtime = get_mtime(crate_dir.join("Cargo.toml"))?;

    // re-run only if any relevant files changed after last transform
    if original_mtime <= transform_mtime
        && src_mtime <= transform_mtime
        && manifest_mtime <= transform_mtime
        && resource_mtime <= transform_mtime
    {
        println!("Aborting since nothing has changed since last build.");
        return Ok(());
    }
    println!("Transforming unidic for Yomikiri...");
    transform(&original_dir, &transform_dir, &resource_dir)?;

    println!("Building unidic lindera files...");
    let builder = UnidicBuilder::new();
    builder.build_dictionary(&transform_dir, &output_dir)?;
    set_file_mtime(&output_dir, FileTime::now())?;
    Ok(())
}

// Get last modification time of all entries in dir recursively, including dir
fn get_last_mtime_of_dir(dir: &Path) -> Result<SystemTime, Box<dyn Error>> {
    let entries = WalkDir::new(dir).into_iter();
    // If files are renamed, only the mtime of the directory changes.
    let mut latest = get_mtime(dir)?;
    for entry in entries.filter_entry(|e| !skip_file_entry(e)) {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let mtime = metadata.modified()?;
        latest = latest.max(mtime);
    }
    Ok(latest)
}

fn get_mtime<P: AsRef<Path>>(path: P) -> Result<SystemTime, Box<dyn Error>> {
    let metadata = fs::metadata(path.as_ref())?;
    let mtime = metadata.modified()?;
    Ok(mtime)
}

fn skip_file_entry(entry: &DirEntry) -> bool {
    let name = entry.file_name();
    if let Some(name) = name.to_str() {
        // skip hidden files starting with '.'
        if name.starts_with(".") {
            return true;
        }
        // thumbs.db is an automatically generated file in Windows
        if name.to_lowercase() == "thumbs.db" {
            return true;
        }
    } else {
        return true;
    }
    return false;
}

/// download and unzip unidic file into `output_path`.
/// `output_path` must exist and be a directory
fn download_unidic_original(output_path: &Path) -> Result<(), Box<dyn Error>> {
    let download_url = "https://clrd.ninjal.ac.jp/unidic_archive/cwj/2.2.0/unidic-cwj-2.2.0.zip";
    println!("Downloading unidic from {}", &download_url);
    let resp = ureq::get(download_url).call()?;
    let mut tmpfile = tempfile::tempfile()?;
    std::io::copy(&mut resp.into_reader(), &mut tmpfile)?;

    // unzip files
    let mut archive = ZipArchive::new(tmpfile)?;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let file_name = file
            .enclosed_name()
            .map(|p| if p.is_dir() { None } else { p.file_name() })
            .flatten();
        if let Some(file_name) = file_name {
            let dest_path = output_path.join(file_name);
            let mut dest = File::create(&dest_path)?;
            std::io::copy(&mut file, &mut dest)?;
        }
    }
    Ok(())
}
