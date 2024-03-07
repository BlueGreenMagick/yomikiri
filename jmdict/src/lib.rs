pub mod jmdict;
pub mod xml;

use std::collections::HashSet;
use std::error::Error;
use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Cursor};
use std::path::Path;

use bincode::Options;
pub use yomikiri_dictionary::entry::Entry;
use yomikiri_dictionary::file::{read_entries, write_entries, DictEntryIndex, DictTermIndex};

use crate::xml::{parse_xml, remove_doctype, unescape_entity};

pub type Result<T> = core::result::Result<T, Box<dyn Error>>;

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
    let output_file = File::create(dict_path).unwrap();
    let mut output_writer = BufWriter::new(output_file);
    let term_indexes = write_entries(&mut output_writer, entries)?;

    let output_index_file = File::create(&index_path).unwrap();
    let output_index_writer = BufWriter::new(output_index_file);
    // use varint encoding
    let options = bincode::DefaultOptions::new();
    options
        .serialize_into(output_index_writer, &term_indexes)
        .unwrap();

    Ok(())
}

pub fn read_yomikiri_dictionary(index_path: &Path, dict_path: &Path) -> Result<Vec<Entry>> {
    let file = File::open(index_path)?;
    let reader = BufReader::new(file);
    let options = bincode::DefaultOptions::new();
    let term_indexes: Vec<DictTermIndex> = options.deserialize_from(reader)?;
    let mut entry_indexes: HashSet<DictEntryIndex> = HashSet::new();
    for term_index in term_indexes {
        for entry_index in term_index.entry_indexes {
            entry_indexes.insert(entry_index);
        }
    }

    let mut entry_indexes: Vec<DictEntryIndex> = entry_indexes.into_iter().collect();
    entry_indexes.sort();

    let dict_bytes: Vec<u8> = fs::read(dict_path)?;
    let mut reader = Cursor::new(dict_bytes);
    let entries = read_entries(&mut reader, &entry_indexes)?;
    Ok(entries)
}
