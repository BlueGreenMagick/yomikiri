mod transform;

use crate::transform::transform;
use std::error::Error;
use std::fs::File;
use std::path::Path;
use vibrato::dictionary::SystemDictionaryBuilder;

pub fn transform_unidic(input_dir: &Path, transform_dir: &Path) -> Result<(), Box<dyn Error>> {
    transform(&input_dir, &transform_dir)
}

pub fn build_unidic(transform_dir: &Path, output_dir: &Path) -> Result<(), Box<dyn Error>> {
    let dict = SystemDictionaryBuilder::from_readers(
        File::open(transform_dir.join("lex.csv"))?,
        File::open(transform_dir.join("matrix.def"))?,
        File::open(transform_dir.join("char.def"))?,
        File::open(transform_dir.join("unk.def"))?,
    )?;
    let mut file = File::create(output_dir.join("unidic.dic"))?;
    dict.write(&mut file)?;
    Ok(())
}
