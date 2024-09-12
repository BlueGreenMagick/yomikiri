use std::io::Write;

use ouroboros::self_referencing;

use crate::entry::{Entry, NameEntry};
use crate::index::{create_sorted_term_indexes, DictIndexMap, EntryPointer};
use crate::jagged_array::JaggedArray;
use crate::{Result, WordEntry};

#[self_referencing]
pub struct Dictionary<D: AsRef<[u8]> + 'static> {
    source: Box<D>,
    #[borrows(source)]
    #[covariant]
    pub view: DictionaryView<'this>,
}

pub struct DictionaryView<'a> {
    pub term_index: DictIndexMap<'a>,
    pub entries: JaggedArray<'a, WordEntry>,
    pub name_entries: JaggedArray<'a, NameEntry>,
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

    pub fn build_and_encode_to<W: Write>(
        name_entries: &[NameEntry],
        entries: &[WordEntry],
        writer: &mut W,
    ) -> Result<()> {
        DictionaryView::build_and_encode_to(name_entries, entries, writer)
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
        let s = Self {
            name_entries,
            term_index,
            entries,
        };
        Ok((s, at))
    }

    pub fn build_and_encode_to<W: Write>(
        name_entries: &[NameEntry],
        entries: &[WordEntry],
        writer: &mut W,
    ) -> Result<()> {
        let term_index_items = create_sorted_term_indexes(entries)?;
        DictIndexMap::build_and_encode_to(&term_index_items, writer)?;
        JaggedArray::build_and_encode_to(entries, writer)?;
        JaggedArray::build_and_encode_to(name_entries, writer)?;
        Ok(())
    }

    pub fn get_entries(&self, pointers: &[EntryPointer]) -> Result<Vec<Entry>> {
        pointers
            .iter()
            .map(|p| match p {
                EntryPointer::Word(idx) => self.entries.get(*idx as usize).map(Entry::Word),
                EntryPointer::Name(idx) => self.name_entries.get(*idx as usize).map(Entry::Name),
            })
            .collect::<Result<Vec<Entry>>>()
    }
}

#[cfg(test)]
mod tests {
    use yomikiri_jmdict::jmnedict::JMneNameType;

    use crate::dictionary::Dictionary;
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
        Dictionary::<Vec<u8>>::build_and_encode_to(&[], &[entry.clone()], &mut buffer)?;
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
        let mut buffer = Vec::with_capacity(1024);
        Dictionary::<Vec<u8>>::build_and_encode_to(&[entry.clone()], &[], &mut buffer)?;
        let dict = Dictionary::try_decode(buffer)?;

        let view = dict.borrow_view();
        assert_eq!(view.entries.len(), 0);
        assert_eq!(view.name_entries.len(), 1);
        assert_eq!(view.name_entries.get(0)?, entry);
        Ok(())
    }
}
