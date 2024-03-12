use flate2::read::GzDecoder;
use std::env;
use std::error::Error;
use std::fs::{self, File};
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use tempfile::NamedTempFile;
use yomikiri_jmdict::{parse_jmdict_xml, write_yomikiri_dictionary};

type Result<T> = std::result::Result<T, Box<dyn Error>>;

fn main() -> Result<()> {
    let crate_dir = env::var_os("CARGO_MANIFEST_DIR").ok_or(
        "CARGO_MANIFEST_DIR env var not found. Are you not running the program with `cargo run`?",
    )?;
    let crate_dir = PathBuf::from(crate_dir);
    let resources_dir = crate_dir.join("resources");
    let jmdict_file_path = resources_dir.join("JMdict_e");
    let output_path = resources_dir.join("english.yomikiridict");
    let output_index_path = resources_dir.join("english.yomikiriindex");

    if !jmdict_file_path.exists() {
        println!("Downloading JMDict file from the web...");
        download_jmdict(&jmdict_file_path)?;
    }

    println!("Parsing downloaded JMDict xml file...",);
    let jmdict_xml = fs::read_to_string(&jmdict_file_path)?;
    let entries = parse_jmdict_xml(&jmdict_xml)?;

    println!("Writing yomikiridict and yomikiriindex...");
    let output_index_file = File::create(&output_index_path)?;
    let mut output_index_writer = BufWriter::new(output_index_file);
    let output_file = File::create(output_path)?;
    let mut output_writer = BufWriter::new(output_file);

    write_yomikiri_dictionary(&mut output_index_writer, &mut output_writer, &entries)?;

    println!("Data writing complete.");
    Ok(())
}

/// download and unzip jmdict file into `output_path`
fn download_jmdict(output_path: &Path) -> Result<()> {
    let output_dir = output_path
        .parent()
        .ok_or("output_path does not have a parent directory.")?;
    std::fs::create_dir_all(output_dir)?;

    // download jmdict gzip file
    let download_url = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
    let resp = ureq::get(download_url).call()?;

    // unzip the single dictionary file in gzip archive
    let mut decoder = GzDecoder::new(resp.into_reader());
    let mut tmpfile = NamedTempFile::new_in(output_dir)?;
    std::io::copy(&mut decoder, &mut tmpfile)?;
    tmpfile.persist(output_path)?;
    Ok(())
}
