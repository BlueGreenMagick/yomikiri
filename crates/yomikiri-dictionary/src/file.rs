use std::io::{Seek, Write};

use byteorder::{LittleEndian, WriteBytesExt};
use fst::MapBuilder;

use crate::entry::Entry;
use crate::error::Result;
use crate::index::{create_sorted_term_indexes, DictTermIndex};
use crate::jagged_array::JaggedArray;

/// Separate chunk when it gets bigger than this size
pub const CHUNK_CUTOFF_SIZE: usize = 16 * 1024;
/// Recommended minimum buffer size
pub const BUFFER_SIZE: usize = CHUNK_CUTOFF_SIZE + 8 * 1024;

pub const DICT_INDEX_FILENAME: &'static str = "english.yomikiriindex";
pub const DICT_ENTRIES_FILENAME: &'static str = "english.yomikiridict";
pub const DICT_METADATA_FILENAME: &'static str = "dictionary-metadata.json";

pub fn write_yomikiri_dictionary<I: Write + Seek, D: Write + Seek>(
    index_writer: &mut I,
    dict_writer: &mut D,
    entries: &[Entry],
) -> Result<()> {
    write_entries(dict_writer, entries)?;
    let term_indexes = create_sorted_term_indexes(&entries)?;
    write_indexes(index_writer, &term_indexes)?;

    Ok(())
}

pub fn parse_jmdict_xml(xml: &str) -> Result<Vec<Entry>> {
    let jm_entries = yomikiri_jmdict::parse_jmdict_xml(xml)?;
    let entries = jm_entries.into_iter().map(Entry::from).collect();
    Ok(entries)
}

pub fn write_entries<W: Write>(writer: &mut W, entries: &[Entry]) -> Result<()> {
    let mut buffer = Vec::with_capacity(1024);
    let arr = JaggedArray::from_vec_with_buffer(&entries, &mut buffer)?;
    arr.encode_to(writer)?;
    Ok(())
}

/// terms must be in lexicographic order.
fn write_indexes<W: Write>(writer: &mut W, terms: &[DictTermIndex]) -> Result<()> {
    let mut fst_bytes: Vec<u8> = Vec::with_capacity(1024 * 1024);
    let mut builder = MapBuilder::new(&mut fst_bytes)?;
    let mut pointers: Vec<Vec<usize>> = vec![];

    for term in terms {
        if term.entry_indexes.len() == 1 {
            let index = term.entry_indexes[0] as u64;
            builder.insert(&term.term, index)?;
        } else {
            let mut term_ids: Vec<usize> = vec![];
            for index in &term.entry_indexes {
                term_ids.push(*index);
            }
            builder.insert(
                &term.term,
                1_u64 << 63 | (pointers.len() as u64 & ((1_u64 << 32) - 1)),
            )?;
            pointers.push(term_ids);
        }
    }
    builder.finish()?;

    writer.write_u32::<LittleEndian>(fst_bytes.len() as u32)?;
    writer.write(&fst_bytes)?;

    let mut pointers_bytes_buffer = Vec::with_capacity(1000);
    let pointers_bytes = JaggedArray::from_vec_with_buffer(&pointers, &mut pointers_bytes_buffer)?;
    pointers_bytes.encode_to(writer)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::entry::{Entry, Form, Reading};
    use crate::jagged_array::JaggedArray;

    use super::{write_entries, Result};

    #[test]
    fn write_then_read_single_entry() -> Result<()> {
        let entry = Entry {
            forms: vec![
                Form {
                    form: "読み切り".into(),
                    info: vec![],
                    uncommon: false,
                },
                Form {
                    form: "読みきり".into(),
                    info: vec![],
                    uncommon: false,
                },
            ],
            readings: vec![Reading {
                reading: "よみきり".into(),
                nokanji: false,
                to_form: vec![],
                info: vec!["information".into()],
                uncommon: false,
            }],
            senses: vec![],
            priority: 10,
        };
        let mut buffer = Vec::new();
        write_entries(&mut buffer, &[entry.clone()])?;

        // decode
        let (entries, _len) = JaggedArray::<Entry>::decode_from_bytes(&buffer[..])?;
        assert_eq!(entries.len(), 1);
        assert_eq!(entries.get(0)?, entry);
        Ok(())
    }
}
