use std::fs::{self, File};
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{Context, Result};
use tokenizers::vaporetto::{create_tokenizer, Vaporetto};

fn main() -> Result<()> {
    let vaporetto = prepare_vaporetto()?;
    let tokens = vaporetto.tokenize("私は学生です。")?;
    println!("{:?}", tokens);
    Ok(())
}

fn prepare_vaporetto() -> Result<Vaporetto> {
    let path = Path::new("./resources/bccwj-suw+unidic_pos+kana.model");
    let bytes = fs::read(&path).with_context(|| format!("Could not open file at {:?}", &path))?;
    let start = time_now();
    let vaporetto = create_tokenizer(&bytes[..])?;
    let end = time_now();
    println!("Time taken to initialize vaporetto: {:.2}ms", end - start);
    Ok(vaporetto)
}

// in ms.
fn time_now() -> f64 {
    let micro = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_micros();
    (micro as f64) / 1000.0
}
