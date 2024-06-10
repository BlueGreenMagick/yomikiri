use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{Context, Result};
use tokenizers::lindera::Lindera;
use tokenizers::vaporetto::{create_tokenizer, Vaporetto};

macro_rules! test {
    (
        $($tokenizer:ident)+;
        $($sentence:literal)+
    ) => {
        let sentences = vec![$($sentence),+];
        for sentence in &sentences {
            println!("");
            println!("Tokenizing: {}", sentence);
            $(
                let start = time_now();
                let tokens = $tokenizer.tokenize(&sentence)?;
                let end = time_now();
                println!("{}: {:.2}ms", stringify!($tokenizer), end - start);
                println!("{:?}", &tokens);
            )+
        };
    }
}

fn main() -> Result<()> {
    println!("\nPreparing Lindera...");
    let lindera = prepare_lindera()?;
    println!("\n");

    test!(
        lindera;
        " "
    );

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

fn prepare_lindera() -> Result<Lindera> {
    let start = time_now();
    let lindera = load_lindera::load()?;
    let end = time_now();
    println!("Time taken to initialize lindera: {:.2}ms", end - start);
    Ok(lindera)
}

// in ms.
fn time_now() -> f64 {
    let micro = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_micros();
    (micro as f64) / 1000.0
}

mod load_lindera {
    use anyhow::Result;
    use std::borrow::Cow;
    use tokenizers::lindera::Lindera;

    macro_rules! lindera_data {
        ($name: ident, $filename: literal) => {
            const $name: &'static [u8] =
                include_bytes!(concat!("../resources/lindera/", $filename));
        };
    }

    macro_rules! cow {
        ($name: ident) => {
            Cow::Borrowed($name)
        };
    }

    lindera_data!(CHAR_DEFINITION_DATA, "char_def.bin");
    lindera_data!(CONNECTION_DATA, "matrix.mtx");
    lindera_data!(UNIDIC_DATA, "dict.da");
    lindera_data!(UNIDIC_VALS, "dict.vals");
    lindera_data!(UNKNOWN_DATA, "unk.bin");
    lindera_data!(WORDS_IDX_DATA, "dict.wordsidx");
    lindera_data!(WORDS_DATA, "dict.words");

    pub fn load() -> Result<Lindera> {
        Lindera::load(
            cow!(UNIDIC_DATA),
            cow!(UNIDIC_VALS),
            cow!(CONNECTION_DATA),
            cow!(CHAR_DEFINITION_DATA),
            cow!(UNKNOWN_DATA),
            cow!(WORDS_IDX_DATA),
            cow!(WORDS_DATA),
        )
    }
}
