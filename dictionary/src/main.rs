mod jmdict;
mod xml;

use std::env;
use std::fmt::{Debug, Display};
use std::fs::{self, File};
use std::io::{BufWriter, Write};
use std::path::{Path, PathBuf};

use yomikiri_dictionary_types::{DictIndexItem, Entry};

use crate::xml::{parse_xml, remove_doctype, unescape_entity};

type Result<T> = core::result::Result<T, CustomError>;

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

fn main() {
    let (input_path, output_path, output_index_path) = read_arguments();
    println!(
        "Reading from {}, writing to {} and {}",
        input_path.to_string_lossy(),
        output_path.to_string_lossy(),
        output_index_path.to_string_lossy()
    );
    let entries = parse_xml_file(&input_path).unwrap();

    println!("Start writing yomikiridict and yomikiriindex");
    let output_file = File::create(&output_path).unwrap();
    let mut output_writer = BufWriter::new(output_file);
    let mut dict_index: Vec<DictIndexItem> = Vec::new();
    let mut offset: u64 = 0;
    let mut largest_size: u64 = 0;
    // write outputs and build entry_index
    for entry in &entries {
        let serialized = bincode::serialize(entry).unwrap();
        output_writer.write(&serialized).unwrap();
        let size = serialized.len() as u64;
        largest_size = largest_size.max(size);
        for term in entry.terms() {
            match dict_index.binary_search_by_key(&term, |item| &item.key) {
                Ok(idx) => {
                    dict_index.get_mut(idx).unwrap().offsets.push(offset);
                    dict_index.get_mut(idx).unwrap().sizes.push(size as u16);
                }
                Err(idx) => {
                    dict_index.insert(
                        idx,
                        DictIndexItem::new(term.to_string(), offset, size as u16),
                    );
                }
            };
        }
        offset += size as u64;
    }
    output_writer.flush().unwrap();

    let output_index_file = File::create(&output_index_path).unwrap();
    let output_index_writer = BufWriter::new(output_index_file);
    bincode::serialize_into(output_index_writer, &dict_index).unwrap();

    println!("Data writing complete.");
    println!("Largest entry binary size is {}", largest_size);
}

fn read_arguments() -> (PathBuf, PathBuf, PathBuf) {
    let mut args = env::args();
    let msg = "This program requires three arguments: <input dict path> <output_path> <output_index_path>";
    let _arg0 = args.next().unwrap();
    let arg1 = args.next().expect(msg);
    let arg2 = args.next().expect(msg);
    let arg3 = args.next().expect(msg);

    let input_path = PathBuf::from(arg1);
    let output_path = PathBuf::from(arg2);
    let output_index_path = PathBuf::from(arg3);
    (input_path, output_path, output_index_path)
}

fn parse_xml_file(input_path: &Path) -> Result<Vec<Entry>> {
    let xml_str = fs::read_to_string(input_path).unwrap();
    let xml_str = remove_doctype(&xml_str);
    let xml_str = unescape_entity(&xml_str);
    println!("Start parsing xml");
    let jm_entries = parse_xml(&xml_str)?;
    Ok(jm_entries.into_iter().map(Entry::from).collect())
}
