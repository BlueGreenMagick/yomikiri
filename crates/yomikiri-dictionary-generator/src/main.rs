use std::io::BufWriter;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use clap::{Args, Parser, Subcommand};
use flate2::read::GzDecoder;
use fs_err::{self as fs, File};
use tempfile::NamedTempFile;
use yomikiri_dictionary::dictionary::DictionaryView;
use yomikiri_dictionary::jmdict::parse_jmdict_xml;

const JMDICT_FILENAME: &str = "JMdict_e.gz";
const JMDICT_SOURCE_URL: &str = "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz";

#[derive(Parser, Debug)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Download jmdict file
    Jmdict(JmdictOpts),
    /// Generate dictionary file from jmdict file
    Generate(GenerateOpts),
}

#[derive(Args, Debug)]
struct JmdictOpts {
    /// Output path to downloaded jmdict file
    #[arg(short, long)]
    out: PathBuf,
    #[command(flatten)]
    mode: JmdictMode,
    /// Force download jmdict file even if file exists at output path
    #[arg(short, long, default_value_t = false)]
    force: bool,
}

#[derive(Args, Debug)]
#[group(required = true, multiple = false)]
struct JmdictMode {
    /// Download jmdict file used in specified version
    #[arg(short, long)]
    version: Option<String>,
    /// Download new jmdict file from source website (edrdg.org)
    #[arg(long)]
    new: bool,
}

#[derive(Args, Debug)]
struct GenerateOpts {
    /// Path to Jmdict xml file
    #[arg(long)]
    jmdict: PathBuf,
    /// Output path to yomikiri dictionary file
    #[arg(short, long)]
    out: PathBuf,
    /// Skip if dictionary file already exist at output path
    #[arg(short, long, default_value_t = false)]
    skip_exist: bool,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Jmdict(opts) => run_jmdict(opts),
        Commands::Generate(opts) => run_generate(opts),
    }
}

fn run_jmdict(opts: &JmdictOpts) -> Result<()> {
    let output_path = &opts.out;

    if output_path.try_exists()? {
        if !opts.force {
            println!("Skipped: Jmdict file already exists at output path.");
            return Ok(());
        } else {
            println!("Deleting file that already exists at output path.");
            fs::remove_file(&output_path)?;
        }
    }

    let output_dir = output_path
        .parent()
        .context("Output path does not have a parent directory.")?;
    fs::create_dir_all(&output_dir)?;

    if opts.mode.new {
        download_jmdict(JMDICT_SOURCE_URL, output_path)
    } else if let Some(version) = opts.mode.version.as_ref() {
        let url = format!(
            "https://github.com/BlueGreenMagick/yomikiri/releases/download/{}/{}",
            version, JMDICT_FILENAME
        );
        download_jmdict(&url, output_path)
    } else {
        Err(anyhow!("Unreachable codepath"))
    }
}

fn run_generate(opts: &GenerateOpts) -> Result<()> {
    let jmdict_file_path = &opts.jmdict;
    let output_path = &opts.out;

    let output_dir = output_path
        .parent()
        .context("output path does not have a parent directory.")?;

    if opts.skip_exist && output_path.try_exists()? {
        println!("Skipped: Yomikiri dictionary file already exists at output path.");
        return Ok(());
    }

    if !jmdict_file_path.exists() {
        return Err(anyhow!("Jmdict file does not exist"));
    }

    println!("Parsing JMDict xml file...",);
    let jmdict_xml = fs::read_to_string(&jmdict_file_path)?;
    let entries = parse_jmdict_xml(&jmdict_xml)?;

    println!("Writing yomikiri dictionary file...");
    fs::create_dir_all(&output_dir)?;
    let output_file = File::create(&output_path)?;
    let mut output_writer = BufWriter::new(output_file);
    DictionaryView::build_and_encode_to(&entries, &mut output_writer)?;

    println!("Generated yomikiri dictionary file.");
    Ok(())
}

/// download and unzip jmdict file into `output_path`
fn download_jmdict(url: &str, output_path: &Path) -> Result<()> {
    let output_dir = output_path
        .parent()
        .context("output_path does not have a parent directory.")?;
    // download jmdict gzip file
    let resp = ureq::get(url)
        .call()
        .context("Could not download file from url")?;

    // unzip the single dictionary file in gzip archive
    let mut decoder = GzDecoder::new(resp.into_reader());
    let mut tmpfile = NamedTempFile::new_in(output_dir)?;
    std::io::copy(&mut decoder, &mut tmpfile)?;
    tmpfile.persist(output_path)?;
    Ok(())
}
