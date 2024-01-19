use crate::error::{YResult, YomikiriError};
use bincode::Options;
use std::fs::File;
use std::io::{BufReader, Read, Seek, SeekFrom};
use yomikiri_dictionary_types::{DictIndexItem, Entry, ENTRY_BUFFER_SIZE};

pub struct Dictionary<R: Seek + Read> {
    index: Vec<DictIndexItem>,
    entries_reader: R,
    // buffer for reading entry
    buf: Box<[u8; ENTRY_BUFFER_SIZE]>,
}

impl<R: Seek + Read> Dictionary<R> {
    pub fn new(index: Vec<DictIndexItem>, entries_reader: R) -> Dictionary<R> {
        Dictionary {
            index,
            entries_reader,
            buf: Box::new([0; ENTRY_BUFFER_SIZE]),
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
                    YomikiriError::InvalidDictionaryFile(format!(
                        "Failed to parse dictionary entry JSON. {}",
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

    pub fn contains(&self, term: &str) -> bool {
        self.index
            .binary_search_by_key(&term, |item| &item.key)
            .is_ok()
    }

    /// Returns json text of entries
    pub fn search_json(&mut self, term: &str) -> YResult<Vec<String>> {
        if let Ok(idx) = self.index.binary_search_by_key(&term, |item| &item.key) {
            let item = &self.index[idx];
            let mut entries = Vec::<String>::with_capacity(item.offsets.len());
            for i in 0..item.offsets.len() {
                let offset = item.offsets[i];
                let size = item.sizes[i];
                let buf_entry = &mut self.buf[0..(size as usize)];
                self.entries_reader.seek(SeekFrom::Start(offset as u64))?;
                self.entries_reader.read_exact(buf_entry)?;
                let entry_json = String::from_utf8(buf_entry.to_vec()).map_err(|_| {
                    YomikiriError::InvalidDictionaryFile(format!(
                        "Failed to parse dictionary entry JSON at offset {} as UTF-8.",
                        offset
                    ))
                })?;
                entries.push(entry_json);
            }
            Ok(entries)
        } else {
            Ok(Vec::with_capacity(0))
        }
    }
}

impl Dictionary<File> {
    pub fn from_paths(index_path: &str, entries_path: &str) -> YResult<Dictionary<File>> {
        let index_file = File::open(index_path)?;
        let reader = BufReader::new(index_file);
        let options = bincode::DefaultOptions::new();
        let index: Vec<DictIndexItem> = options.deserialize_from(reader).map_err(|e| {
            YomikiriError::InvalidDictionaryFile(format!(
                "Failed to parse dictionary index file. {}",
                e.to_string()
            ))
        })?;
        let entries_file = File::open(entries_path)?;
        Ok(Dictionary::new(index, entries_file))
    }
}
