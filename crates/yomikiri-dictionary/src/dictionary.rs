use std::io::{BufRead, Write};

use bincode::Options;
use ouroboros::self_referencing;
use serde::{Deserialize, Serialize};
use yomikiri_jmdict::{JMDictParser, JMneDictParser};

use crate::entry::{Entry, NameEntry};
use crate::index::{create_sorted_term_indexes, DictIndexMap, EntryIdx};
use crate::jagged_array::JaggedArray;
use crate::jmnedict::{parse_jmnedict_entry, NameEntriesBuilder};
use crate::{Result, WordEntry};

#[cfg(feature = "wasm")]
use tsify_next::Tsify;

#[self_referencing]
pub struct Dictionary<D: AsRef<[u8]> + 'static> {
    source: Box<D>,
    #[borrows(source)]
    #[covariant]
    pub view: DictionaryView<'this>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[cfg_attr(feature = "wasm", tsify(into_wasm_abi))]
pub struct DictionaryMetadata {
    jmdict_creation_date: Option<String>,
    jmnedict_creation_date: Option<String>,
}

pub struct DictionaryView<'a> {
    pub term_index: DictIndexMap<'a, EntryIdx>,
    pub entries: JaggedArray<'a, WordEntry>,
    pub name_entries: JaggedArray<'a, NameEntry>,
    pub metadata: DictionaryMetadata,
}

impl<D: AsRef<[u8]> + 'static> Dictionary<D> {
    pub fn try_decode(source: D) -> Result<Self> {
        let builder = DictionaryTryBuilder {
            source: Box::new(source),
            view_builder: |source| {
                DictionaryView::try_decode(source.as_ref().as_ref()).map(|(inner, _len)| inner)
            },
        };
        builder.try_build()
    }
}

impl<'a> DictionaryView<'a> {
    pub fn try_decode(source: &'a [u8]) -> Result<(Self, usize)> {
        let mut at = 0;
        let (term_index, len) = DictIndexMap::try_decode(&source[at..])?;
        at += len;
        let (entries, len) = JaggedArray::try_decode(&source[at..])?;
        at += len;
        let (name_entries, len) = JaggedArray::try_decode(&source[at..])?;
        at += len;
        let metadata = bincode::options().deserialize_from(&source[at..])?;
        let s = Self {
            name_entries,
            term_index,
            entries,
            metadata,
        };
        Ok((s, at))
    }

    pub fn build_and_encode_to<W: Write>(
        name_entries: &[NameEntry],
        entries: &[WordEntry],
        metadata: &DictionaryMetadata,
        writer: &mut W,
    ) -> Result<()> {
        let term_index_items = create_sorted_term_indexes(name_entries, entries)?;
        DictIndexMap::build_and_encode_to(&term_index_items, writer)?;
        JaggedArray::build_and_encode_to(entries, writer)?;
        JaggedArray::build_and_encode_to(name_entries, writer)?;
        bincode::options().serialize_into(writer, metadata)?;
        Ok(())
    }

    pub fn get_entries(&self, pointers: &[EntryIdx]) -> Result<Vec<Entry>> {
        pointers
            .iter()
            .map(|p| match p {
                EntryIdx::Word(idx) => self.entries.get(idx.0 as usize).map(Entry::Word),
                EntryIdx::Name(idx) => self.name_entries.get(idx.0 as usize).map(Entry::Name),
            })
            .collect::<Result<Vec<Entry>>>()
    }
}

pub struct DictionaryWriterJMDict {}
pub struct DictionaryWriterJMneDict {
    entries: Vec<WordEntry>,
    jmdict_creation_date: Option<String>,
}

pub struct DictionaryWriterFinal {
    entries: Vec<WordEntry>,
    jmdict_creation_date: Option<String>,
    name_entries: Vec<NameEntry>,
    jmnedict_creation_date: Option<String>,
}

#[derive(Default)]
pub struct DictionaryWriter<STATE> {
    state: STATE,
}

impl DictionaryWriter<DictionaryWriterJMDict> {
    pub fn new() -> Self {
        Self {
            state: DictionaryWriterJMDict {},
        }
    }

    pub fn read_jmdict<R: BufRead>(
        self,
        jmdict: R,
    ) -> Result<DictionaryWriter<DictionaryWriterJMneDict>> {
        let mut parser = JMDictParser::new(jmdict)?;
        // 203736 entries (2022-08-23)
        let mut entries = Vec::with_capacity(210000);
        while let Some(entry) = parser.next_entry()? {
            if entry.id < 5000000 || entry.id >= 6000000 {
                entries.push(WordEntry::try_from(entry)?)
            }
        }
        Ok(DictionaryWriter {
            state: DictionaryWriterJMneDict {
                entries,
                jmdict_creation_date: parser.creation_date().map(|d| d.to_string()),
            },
        })
    }
}

impl DictionaryWriter<DictionaryWriterJMneDict> {
    pub fn read_jmnedict<R: BufRead>(
        mut self,
        jmnedict: R,
    ) -> Result<DictionaryWriter<DictionaryWriterFinal>> {
        let mut name_builder = NameEntriesBuilder::new();

        let mut parser = JMneDictParser::new(jmnedict)?;
        while let Some(entry) = parser.next_entry()? {
            parse_jmnedict_entry(&mut self.state.entries, &mut name_builder, entry)?;
        }

        let mut name_entries = Vec::with_capacity(NameEntriesBuilder::ENTRIES_CAPACITY);
        for name_entry in name_builder.into_iter() {
            name_entries.push(name_entry);
        }

        Ok(DictionaryWriter {
            state: DictionaryWriterFinal {
                entries: self.state.entries,
                jmdict_creation_date: self.state.jmdict_creation_date,
                name_entries,
                jmnedict_creation_date: parser.creation_date().map(|d| d.to_string()),
            },
        })
    }
}

impl DictionaryWriter<DictionaryWriterFinal> {
    pub fn write<W: Write>(self, writer: &mut W) -> Result<()> {
        let metadata = DictionaryMetadata {
            jmdict_creation_date: self.state.jmdict_creation_date,
            jmnedict_creation_date: self.state.jmnedict_creation_date,
        };
        DictionaryView::build_and_encode_to(
            &self.state.name_entries,
            &self.state.entries,
            &metadata,
            writer,
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use yomikiri_jmdict::jmnedict::JMneNameType;

    use crate::dictionary::{Dictionary, DictionaryMetadata, DictionaryView};
    use crate::entry::{
        GroupedNameItem, Kanji, NameEntry, NameItem, Rarity, Reading, WordEntry, WordEntryInner,
    };
    use crate::Result;

    #[test]
    fn write_then_read_dictionary_with_single_word_entry() -> Result<()> {
        let inner = WordEntryInner {
            id: 1234,
            kanjis: vec![
                Kanji {
                    kanji: "読み切り".into(),
                    rarity: Rarity::Normal,
                },
                Kanji {
                    kanji: "読みきり".into(),
                    rarity: Rarity::Normal,
                },
            ],
            readings: vec![Reading {
                reading: "よみきり".into(),
                nokanji: false,
                to_kanji: vec![],
                rarity: Rarity::Normal,
            }],
            grouped_senses: vec![],
            priority: 10,
        };
        let entry = WordEntry::new(inner)?;
        let mut buffer = Vec::with_capacity(1024);
        let metadata = DictionaryMetadata {
            jmdict_creation_date: Some("2024-09-19".into()),
            jmnedict_creation_date: None,
        };
        DictionaryView::build_and_encode_to(&[], &[entry.clone()], &metadata, &mut buffer)?;
        let dict = Dictionary::try_decode(buffer)?;

        let view = dict.borrow_view();
        assert_eq!(view.name_entries.len(), 0);
        assert_eq!(view.entries.len(), 1);
        assert_eq!(view.entries.get(0)?, entry);
        Ok(())
    }

    #[test]
    fn write_then_read_dictionary_with_single_name_entry() -> Result<()> {
        let entry = NameEntry {
            kanji: "雅哉".into(),
            groups: vec![GroupedNameItem {
                types: vec![JMneNameType::Forename],
                items: vec![NameItem {
                    id: 5174270,
                    reading: "まさや".into(),
                }],
            }],
        };
        let metadata = DictionaryMetadata {
            jmdict_creation_date: None,
            jmnedict_creation_date: Some("2024-09-19".into()),
        };
        let mut buffer = Vec::with_capacity(1024);
        DictionaryView::build_and_encode_to(&[entry.clone()], &[], &metadata, &mut buffer)?;
        let dict = Dictionary::try_decode(buffer)?;

        let view = dict.borrow_view();
        assert_eq!(view.entries.len(), 0);
        assert_eq!(view.name_entries.len(), 1);
        assert_eq!(view.name_entries.get(0)?, entry);
        Ok(())
    }
}
