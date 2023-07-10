use crate::error::{YResult, YomikiriError};
use crate::{utils, SharedBackend};
use std::io::{Read, Seek, SeekFrom};
use yomikiri_dictionary_types::{DictIndexItem, Entry, ENTRY_BUFFER_SIZE};

#[cfg(uniffi)]
use std::fs::File;
#[cfg(uniffi)]
use std::io::BufReader;

pub struct Dictionary<R: Seek + Read> {
    index: Vec<DictIndexItem>,
    entries_reader: R,
    // buffer for reading entry
    buf: Vec<u8>,
}

impl<R: Seek + Read> Dictionary<R> {
    pub fn new(index: Vec<DictIndexItem>, entries_reader: R) -> Dictionary<R> {
        Dictionary {
            index,
            entries_reader,
            buf: vec![0; ENTRY_BUFFER_SIZE],
        }
    }

    pub fn search(&mut self, term: &str) -> YResult<Vec<Entry>> {
        if let Ok(idx) = self.index.binary_search_by_key(&term, |item| &item.key) {
            let item = &self.index[idx];
            let mut entries = Vec::<Entry>::with_capacity(item.offsets.len());
            for i in 0..item.offsets.len() {
                let offset = item.offsets[i];
                let size = item.sizes[i];
                let buf_entry = &mut self.buf[0..(size as usize)];
                self.entries_reader.seek(SeekFrom::Start(offset as u64))?;
                self.entries_reader.read_exact(buf_entry)?;
                let entry: Entry = serde_json::from_slice(buf_entry).map_err(|e| {
                    YomikiriError::invalid_dictionary_file(format!(
                        "Error deserializing json: {}",
                        e.to_string()
                    ))
                })?;
                entries.push(entry)
            }
            Ok(entries)
        } else {
            Ok(Vec::with_capacity(0))
        }
    }

    /// Returns true only if there is a dictionary term
    /// that starts with `prefix` and is not `prefix`
    pub fn has_starts_with_excluding(&mut self, prefix: &str) -> bool {
        let next_idx = match self.index.binary_search_by_key(&prefix, |item| &item.key) {
            Ok(idx) => idx + 1,
            Err(idx) => idx,
        };
        if next_idx == self.index.len() {
            false
        } else {
            self.index[next_idx].key.starts_with(prefix)
        }
    }
}

impl<R: Read + Seek> SharedBackend<R> {
    pub fn search(&mut self, term: &str) -> YResult<Vec<Entry>> {
        self.dictionary.search(term)
    }
}
