pub mod error;
pub mod jmdict;
pub mod xml;

use std::fs::{self, File};
use std::io::BufWriter;
use std::path::Path;

pub use crate::error::Error;
pub use yomikiri_dictionary::entry::Entry;
use yomikiri_dictionary::file::{write_entries, write_indexes};

use crate::xml::{parse_xml, remove_doctype, unescape_entity};

pub type Result<T> = core::result::Result<T, Error>;

pub fn parse_xml_file(input_path: &Path) -> Result<Vec<Entry>> {
    let xml_str = fs::read_to_string(input_path).unwrap();
    let xml_str = remove_doctype(&xml_str);
    let xml_str = unescape_entity(&xml_str);
    println!("Start parsing xml");
    let jm_entries = parse_xml(&xml_str)?;
    Ok(jm_entries.into_iter().map(Entry::from).collect())
}

pub fn write_yomikiri_dictionary(
    index_path: &Path,
    dict_path: &Path,
    entries: &[Entry],
) -> Result<()> {
    let output_file = File::create(dict_path)?;
    let mut output_writer = BufWriter::new(output_file);
    let term_indexes = write_entries(&mut output_writer, entries)?;

    let output_index_file = File::create(&index_path)?;
    let mut output_index_writer = BufWriter::new(output_index_file);
    write_indexes(&mut output_index_writer, &term_indexes)?;

    Ok(())
}
