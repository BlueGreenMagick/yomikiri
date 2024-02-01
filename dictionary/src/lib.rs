pub mod jmdict;
pub mod xml;

use std::collections::HashSet;
use std::fmt::{Debug, Display};
use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Write};
use std::path::Path;

use bincode::Options;
use yomikiri_dictionary_types::{DictIndexItem, Entry};

use crate::xml::{parse_xml, remove_doctype, unescape_entity};

#[derive(Debug)]
pub struct CustomError {
    pub msg: String,
}

impl<D: Display> From<D> for CustomError {
    fn from(value: D) -> Self {
        CustomError {
            msg: format!("{}", value),
        }
    }
}

pub type Result<T> = core::result::Result<T, CustomError>;

pub fn parse_xml_file(input_path: &Path) -> Result<Vec<Entry>> {
    let xml_str = fs::read_to_string(input_path).unwrap();
    let xml_str = remove_doctype(&xml_str);
    let xml_str = unescape_entity(&xml_str);
    println!("Start parsing xml");
    let jm_entries = parse_xml(&xml_str)?;
    Ok(jm_entries.into_iter().map(Entry::from).collect())
}

pub fn write_json_files(index_path: &Path, dict_path: &Path, entries: &Vec<Entry>) -> Result<u32> {
    let output_file = File::create(&dict_path).unwrap();
    let mut output_writer = BufWriter::new(output_file);
    let mut dict_index: Vec<DictIndexItem> = Vec::with_capacity(entries.len());
    let mut offset: u32 = 0;
    let mut largest_size: u32 = 0;
    // write outputs and build entry_index
    for entry in entries {
        let serialized = serde_json::to_vec(entry).unwrap();
        output_writer.write(&serialized).unwrap();
        let size = u16::try_from(serialized.len()).unwrap();
        largest_size = largest_size.max(size as u32);
        for term in entry.terms() {
            match dict_index.binary_search_by_key(&term, |item| &item.key) {
                Ok(idx) => {
                    let item = dict_index.get_mut(idx).unwrap();
                    item.offsets.push(offset);
                    item.sizes.push(size);
                }
                Err(idx) => {
                    dict_index.insert(idx, DictIndexItem::new(term.to_string(), offset, size));
                }
            };
        }
        offset += size as u32;
    }
    output_writer.flush().unwrap();

    let output_index_file = File::create(&index_path).unwrap();
    let output_index_writer = BufWriter::new(output_index_file);
    // use varint encoding
    let options = bincode::DefaultOptions::new();
    options
        .serialize_into(output_index_writer, &dict_index)
        .unwrap();

    Ok(largest_size)
}

pub fn parse_json_file(index_path: &Path, dict_path: &Path) -> Result<Vec<Entry>> {
    let file = File::open(index_path)?;
    let reader = BufReader::new(file);
    let index_entries: Vec<DictIndexItem> = bincode::deserialize_from(reader)?;
    let mut indices: HashSet<u32> = HashSet::new();
    for entry in index_entries {
        for offset in entry.offsets {
            indices.insert(offset);
        }
    }

    let mut indices: Vec<u32> = indices.into_iter().collect();
    indices.sort();

    let mut entries: Vec<Entry> = vec![];
    let dict_bytes: Vec<u8> = fs::read(dict_path)?;
    for i in 0..indices.len() - 1 {
        let start = indices[i];
        let end = indices[i + 1];
        let entry_bytes = &dict_bytes[start as usize..end as usize];
        let entry: Entry = bincode::deserialize(entry_bytes)?;
        entries.push(entry);
    }
    let entry_bytes = &dict_bytes[indices.len() - 1 as usize..];
    let entry: Entry = bincode::deserialize(entry_bytes)?;
    entries.push(entry);

    Ok(entries)
}
