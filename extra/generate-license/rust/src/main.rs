use std::error::Error;
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::PathBuf;

use bundle_licenses_lib::bundle::BundleBuilder;
use bundle_licenses_lib::format::Format;
use clap::Parser;

type Result<T> = std::result::Result<T, Box<dyn Error>>;

#[derive(Parser)]
struct Args {
    #[arg(short, long)]
    output: Option<PathBuf>,
}

fn main() -> Result<()> {
    let args = Args::parse();
    let bundle = BundleBuilder::exec_with_previous(None)?;

    let writer: Box<dyn Write + Send + 'static> = match args.output {
        Some(path) => Box::new(File::create(path)?),
        None => Box::new(std::io::stdout()),
    };
    let writer = BufWriter::new(writer);
    Format::Json.serialize_to_writer(writer, &bundle)?;
    Ok(())
}
