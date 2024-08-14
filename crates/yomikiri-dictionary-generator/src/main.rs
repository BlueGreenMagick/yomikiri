use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use std::{env, fs};

use anyhow::{Context, Result};
use clap::{Args, Parser, Subcommand};
use flate2::read::GzDecoder;
use tempfile::NamedTempFile;
use yomikiri_dictionary::file::{
    parse_jmdict_xml, write_bincode_entries, write_yomikiri_dictionary, DICT_ENTRIES_FILENAME,
    DICT_INDEX_FILENAME, DICT_METADATA_FILENAME,
};
use yomikiri_dictionary::metadata::DictMetadata;
use yomikiri_dictionary::Entry;

const URL: &'static str =
    "https://github.com/BlueGreenMagick/yomikiri/releases/download/jmdict-jun-25/";

#[derive(Parser, Debug)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    Download(DownloadOpts),
    Generate(GenerateOpts),
}

#[derive(Args, Debug)]
struct DownloadOpts {
    /// force download dictionary file
    #[arg(short, long, default_value_t = false)]
    force: bool,
    #[arg(short, long, default_value_t = URL.into())]
    url: String,
}

#[derive(Args, Debug)]
struct GenerateOpts {
    /// Redownload new JMDict dictionary
    #[arg(short, long, default_value_t = false)]
    update: bool,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Download(opts) => run_download(opts),
        Commands::Generate(opts) => run_generate(opts),
    }
}

fn run_download(opts: &DownloadOpts) -> Result<()> {
    let crate_dir = get_crate_dir()?;
    let resources_dir = crate_dir.join("files");
    fs::create_dir_all(&resources_dir)?;

    let filenames = [
        DICT_INDEX_FILENAME,
        DICT_ENTRIES_FILENAME,
        DICT_METADATA_FILENAME,
    ];
    let url_file_path = resources_dir.join("URL");
    let mut url_base = opts.url.clone();
    if !url_base.ends_with('/') {
        url_base.push('/');
    }

    // if false, reuse existing file if it exists
    let mut force_redownload = opts.force;
    if !force_redownload {
        if !url_file_path.exists() {
            force_redownload = true
        } else {
            let content = fs::read_to_string(&url_file_path)?;
            if content != url_base {
                force_redownload = true
            }
        }
    }

    for filename in filenames {
        let file_path = resources_dir.join(filename);
        if file_path.exists() && !force_redownload {
            println!("File already downloaded: {:?}", file_path);
            continue;
        }

        let _ = fs::remove_file(&file_path);

        let mut url = url_base.clone();
        url.push_str(filename);
        println!("Downloading '{}' from {}", filename, url);
        download_file(&url, &file_path)?;
    }

    fs::write(url_file_path, URL)?;
    Ok(())
}

fn get_crate_dir() -> Result<PathBuf> {
    let crate_dir = env::var_os("CARGO_MANIFEST_DIR").context(
        "CARGO_MANIFEST_DIR env var not found. Are you not running the program with `cargo run`?",
    )?;
    let crate_dir = PathBuf::from(crate_dir);
    Ok(crate_dir)
}

fn download_file(url: &str, output_path: &Path) -> Result<()> {
    let output_dir = output_path
        .parent()
        .context("output_path does not have a parent directory.")?;
    let resp = ureq::get(url).call()?;
    let mut reader = resp.into_reader();
    let mut tmpfile = NamedTempFile::new_in(output_dir)?;
    std::io::copy(&mut reader, &mut tmpfile)?;
    tmpfile.persist(output_path)?;
    Ok(())
}

fn run_generate(opts: &GenerateOpts) -> Result<()> {
    let crate_dir = get_crate_dir()?;
    let resources_dir = crate_dir.join("files");
    let jmdict_dir = crate_dir.join("jmdict");
    let jmdict_file_path = jmdict_dir.join("JMdict_e");
    let output_path = resources_dir.join(DICT_ENTRIES_FILENAME);
    let output_index_path = resources_dir.join(DICT_INDEX_FILENAME);

    let bincode_entries_path = resources_dir.join("english-bincode.yomikiridict");

    fs::create_dir_all(&jmdict_dir)?;

    let mut jmdict_downloaded = false;

    if opts.update || !jmdict_file_path.exists() {
        if jmdict_file_path.exists() {
            fs::remove_file(&jmdict_file_path)?;
        }
        println!("Downloading JMDict file from the web...");
        download_jmdict(&jmdict_file_path)?;
        jmdict_downloaded = true;
    } else {
        println!("Reusing existing JMDict file...")
    }

    println!("Parsing downloaded JMDict xml file...",);
    let jmdict_xml = fs::read_to_string(&jmdict_file_path)?;
    let entries: Vec<Entry<'static>> = parse_jmdict_xml(&jmdict_xml)?;

    println!("Writing yomikiridict and yomikiriindex...");
    // ignore error from directory not existing
    fs::create_dir_all(&resources_dir)
        .with_context(|| format!("Could not create directory: {:?}", &resources_dir))?;
    let output_index_file = File::create(&output_index_path)?;
    let mut output_index_writer = BufWriter::new(output_index_file);
    let output_file = File::create(&output_path)?;
    let mut output_writer = BufWriter::new(output_file);

    write_yomikiri_dictionary(&mut output_index_writer, &mut output_writer, &entries)?;

    println!("Writing bincode yomikiri entries");
    write_bincode_yomikiri_entries(&bincode_entries_path, &entries)?;

    if jmdict_downloaded {
        println!("Writing metadata.json...");
        let index_file_size = fs::metadata(&output_index_path)?.len();
        let entries_file_size = fs::metadata(&output_path)?.len();
        let files_size = index_file_size + entries_file_size;

        let metadata = DictMetadata::new(files_size, false);
        let metadata_json_path = resources_dir.join("dictionary-metadata.json");
        let metadata_json_file = File::create(metadata_json_path)?;
        let mut metadata_writer = BufWriter::new(metadata_json_file);
        serde_json::to_writer(&mut metadata_writer, &metadata)?;
    }

    println!("Data writing complete.");
    Ok(())
}

/// download and unzip jmdict file into `output_path`
fn download_jmdict(output_path: &Path) -> Result<()> {
    let output_dir = output_path
        .parent()
        .context("output_path does not have a parent directory.")?;
    // download jmdict gzip file
    let download_url = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";
    let resp = ureq::get(download_url)
        .call()
        .context("Could not download file from url")?;

    // unzip the single dictionary file in gzip archive
    let mut decoder = GzDecoder::new(resp.into_reader());
    let mut tmpfile = NamedTempFile::new_in(output_dir)?;
    std::io::copy(&mut decoder, &mut tmpfile)?;
    tmpfile.persist(output_path)?;
    Ok(())
}

fn write_bincode_yomikiri_entries(output_path: &Path, entries: &Vec<Entry<'static>>) -> Result<()> {
    let file = File::open(output_path)?;
    let mut writer = BufWriter::new(file);
    write_bincode_entries(&mut writer, entries)?;
    Ok(())
}
