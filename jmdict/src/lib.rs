pub mod error;
pub mod jmdict;
pub mod xml;

use std::io::Write;

pub use crate::error::Error;
pub use yomikiri_dictionary::entry::Entry;
use yomikiri_dictionary::file::{write_entries, write_indexes};

use crate::xml::{parse_xml, remove_doctype, unescape_entity};

pub type Result<T> = core::result::Result<T, Error>;

pub fn parse_jmdict_xml(xml: &str) -> Result<Vec<Entry>> {
    let xml = remove_doctype(&xml);
    let xml = unescape_entity(&xml);
    println!("Start parsing xml");
    let jm_entries = parse_xml(&xml)?;
    Ok(jm_entries.into_iter().map(Entry::from).collect())
}

pub fn write_yomikiri_dictionary<I: Write, D: Write>(
    index_writer: &mut I,
    dict_writer: &mut D,
    entries: &[Entry],
) -> Result<()> {
    let term_indexes = write_entries(dict_writer, entries)?;
    write_indexes(index_writer, &term_indexes)?;

    Ok(())
}
