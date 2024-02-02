mod transform;

use crate::transform::transform;
use lindera_core::dictionary_builder::DictionaryBuilder;
use lindera_unidic_builder::unidic_builder::UnidicBuilder;
use std::error::Error;
use std::path::Path;

pub fn transform_unidic(
    input_dir: &Path,
    transform_dir: &Path,
    resource_dir: &Path,
) -> Result<(), Box<dyn Error>> {
    transform(&input_dir, &transform_dir, &resource_dir)
}

pub fn build_unidic(transform_dir: &Path, output_dir: &Path) -> Result<(), Box<dyn Error>> {
    let builder = UnidicBuilder::new();
    builder.build_dictionary(&transform_dir, &output_dir)?;
    Ok(())
}
