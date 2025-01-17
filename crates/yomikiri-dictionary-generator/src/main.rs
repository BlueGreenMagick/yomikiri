use std::io::{BufReader, BufWriter};
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use clap::{Args, Parser, Subcommand};
use flate2::read::GzDecoder;
use fs_err::{self as fs, File};
use tempfile::NamedTempFile;
use yomikiri_dictionary::dictionary::DictionaryWriter;

const GH_DICT_TAG: &str = "jmdict-2025-01-04";

struct RawFileMeta {
    source_filename: &'static str,
    source_url: &'static str,
    out_filename: &'static str,
}

const JMDICT_FILE_META: RawFileMeta = RawFileMeta {
    source_filename: "JMDICT_e.gz",
    source_url: "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz",
    out_filename: "jmdict_english.xml",
};

const JMNEDICT_FILE_META: RawFileMeta = RawFileMeta {
    source_filename: "JMnedict.xml.gz",
    source_url: "http://ftp.edrdg.org/pub/Nihongo/JMnedict.xml.gz",
    out_filename: "jmnedict.xml",
};

const RAW_FILE_METAS: [RawFileMeta; 2] = [JMDICT_FILE_META, JMNEDICT_FILE_META];

#[derive(Parser, Debug)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Download jmdict file
    Download(DownloadOpts),
    /// Generate dictionary file from jmdict file
    Generate(GenerateOpts),
}

#[derive(Args, Debug)]
struct DownloadOpts {
    /// Output directory path to downloaded jmdict file
    #[arg(long)]
    outdir: PathBuf,

    #[command(flatten)]
    mode: DownloadMode,
    /// Force download jmdict file even if file exists at output path
    #[arg(short, long, default_value_t = false)]
    force: bool,
}

#[derive(Args, Debug)]
#[group(multiple = false)]
struct DownloadMode {
    /// Download jmdict file stored in release with the specific tag in the yomikiri repo
    #[arg(short, long)]
    tag: Option<String>,
    /// Download new jmdict file from source website (edrdg.org)
    #[arg(long)]
    new: bool,
}

#[derive(Args, Debug)]
struct GenerateOpts {
    /// Path to directory that contains jmdict files
    #[arg(long)]
    rawdir: PathBuf,
    /// Output path to yomikiri dictionary file
    #[arg(short, long)]
    out: PathBuf,
    /// Skip if dictionary file already exist at output path
    #[arg(short, long, default_value_t = false)]
    skip_exist: bool,
}

fn main() -> Result<()> {
    setup_logger()?;
    let cli = Cli::parse();

    match &cli.command {
        Commands::Download(opts) => run_download(opts),
        Commands::Generate(opts) => run_generate(opts),
    }
}

fn run_download(opts: &DownloadOpts) -> Result<()> {
    let output_dir = &opts.outdir;

    fs::create_dir_all(&output_dir)?;

    for meta in RAW_FILE_METAS {
        let output_path = output_dir.join(meta.out_filename);
        if output_path.try_exists()? {
            if !opts.force {
                println!("Skipped: '{}' already exists.", &meta.out_filename);
                continue;
            } else {
                fs::remove_file(&output_path)?;
                println!("Deleted file '{}'", &meta.out_filename);
            }
        }
        if opts.mode.new {
            download_dict(meta.source_url, &output_path)?;
        } else {
            let tag = opts.mode.tag.as_deref().unwrap_or(GH_DICT_TAG);
            let url = format!(
                "https://github.com/BlueGreenMagick/yomikiri/releases/download/{}/{}",
                tag, &meta.source_filename
            );
            download_dict(&url, &output_path)?;
        }
        println!("Downloaded file '{}'", &meta.out_filename);
    }
    Ok(())
}

fn run_generate(opts: &GenerateOpts) -> Result<()> {
    let rawdir_path = &opts.rawdir;
    let output_path = &opts.out;

    let output_dir = output_path
        .parent()
        .context("output path does not have a parent directory.")?;

    if opts.skip_exist && output_path.try_exists()? {
        println!("Skipped: Yomikiri dictionary file already exists at output path.");
        return Ok(());
    }

    let jmdict_file_path = rawdir_path.join(JMDICT_FILE_META.out_filename);
    let jmnedict_file_path = rawdir_path.join(JMNEDICT_FILE_META.out_filename);
    if !jmdict_file_path.exists() {
        return Err(anyhow!("Jmdict file does not exist"));
    }
    if !jmnedict_file_path.exists() {
        return Err(anyhow!("JMnedict file does not exist"));
    }

    let writer = DictionaryWriter::new();

    println!("Parsing JMDict xml file...",);
    let jmdict_file = File::open(&jmdict_file_path)?;
    let jmdict_reader = BufReader::new(jmdict_file);
    let writer = writer.read_jmdict(jmdict_reader)?;

    println!("Parsing JMneDict xml file...");
    let jmnedict_file = File::open(&jmnedict_file_path)?;
    let jmnedict_reader = BufReader::new(jmnedict_file);
    let writer = writer.read_jmnedict(jmnedict_reader)?;

    println!("Creating index and writing yomikiri dictionary file...");
    fs::create_dir_all(&output_dir)?;
    let output_file = File::create(&output_path)?;
    let mut output_writer = BufWriter::new(output_file);
    writer.write(&mut output_writer)?;

    println!("Generated yomikiri dictionary file.");
    Ok(())
}

/// download and unzip jmdict file into `output_path`
fn download_dict(url: &str, output_path: &Path) -> Result<()> {
    let output_dir = output_path
        .parent()
        .context("output_path does not have a parent directory.")?;
    println!("Downloading file from: {}", url);
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

fn setup_logger() -> Result<()> {
    fern::Dispatch::new()
        .level(log::LevelFilter::Debug)
        .apply()
        .context("Could not initialize logger")
}
