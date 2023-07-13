use filetime::set_file_mtime;
use filetime::FileTime;
use std::env;
use std::error::Error;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::time::SystemTime;
use walkdir::{DirEntry, WalkDir};
use yomikiri_unidic_build::{build_unidic, transform_unidic};

fn main() -> Result<(), Box<dyn Error>> {
    // We compare mtime instead of using `rerun-if-changed`
    // because build script is rerun when compilation target changes
    let crate_dir = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let input_dir = crate_dir.join("original");
    let transform_dir = crate_dir.join("transformed");
    let output_dir = crate_dir.join("output");
    let src_dir = crate_dir.join("src");
    let build_crate_dir = crate_dir.join("unidic-build");

    let input_mtime = get_last_mtime_of_dir(&input_dir)?;
    let transform_mtime = get_last_mtime_of_dir(&transform_dir)?;
    let src_mtime = get_last_mtime_of_dir(&src_dir)?;
    let build_crate_mtime = get_last_mtime_of_dir(&build_crate_dir)?;
    let manifest_mtime = get_mtime(crate_dir.join("Cargo.toml"))?;
    let build_rs_mtime = get_mtime(crate_dir.join("build.rs"))?;

    // re-run only if any relevant files changed after last transform
    if input_mtime <= transform_mtime
        && src_mtime <= transform_mtime
        && build_crate_mtime <= transform_mtime
        && manifest_mtime <= transform_mtime
        && build_rs_mtime <= transform_mtime
    {
        return Ok(());
    }
    transform_unidic(&input_dir, &transform_dir)?;
    set_file_mtime(&transform_dir, FileTime::now())?;

    // re-run build only if transform has updated after last build
    let transform_mtime = get_last_mtime_of_dir(&transform_dir)?;
    let output_mtime = get_last_mtime_of_dir(&output_dir)?;
    if transform_mtime <= output_mtime {
        return Ok(());
    }

    build_unidic(&transform_dir, &output_dir)?;
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
