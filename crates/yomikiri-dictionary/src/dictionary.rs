use std::io::Write;

use ouroboros::self_referencing;

use crate::index::{create_sorted_term_indexes, DictIndexMap};
use crate::jagged_array::JaggedArray;
use crate::{Entry, Result};

#[self_referencing]
pub struct Dictionary<D: AsRef<[u8]> + 'static> {
    source: Box<D>,
    #[borrows(source)]
    #[covariant]
    pub view: DictionaryView<'this>,
}

pub struct DictionaryView<'a> {
    pub term_index: DictIndexMap<'a>,
    pub entries: JaggedArray<'a, Entry>,
}

impl<D: AsRef<[u8]> + 'static> Dictionary<D> {
    pub fn try_decode(source: D) -> Result<Self> {
        let builder = DictionaryTryBuilder {
            source: Box::new(source),
            view_builder: |source| {
                DictionaryView::try_decode(source.as_ref()).map(|(inner, _len)| inner)
            },
        };
        builder.try_build()
    }

    pub fn build_and_encode_to<W: Write>(entries: &[Entry], writer: &mut W) -> Result<()> {
        DictionaryView::build_and_encode_to(entries, writer)
    }
}

impl<'a> DictionaryView<'a> {
    pub fn try_decode(source: &'a [u8]) -> Result<(Self, usize)> {
        let mut at = 0;
        let (term_index, len) = DictIndexMap::try_decode(&source[at..])?;
        at += len;
        let (entries, len) = JaggedArray::try_decode(&source[at..])?;
        at += len;
        let s = Self {
            term_index,
            entries,
        };
        Ok((s, at))
    }

    pub fn build_and_encode_to<W: Write>(entries: &[Entry], writer: &mut W) -> Result<()> {
        let term_index_items = create_sorted_term_indexes(entries)?;
        DictIndexMap::build_and_encode_to(&term_index_items, writer)?;
        JaggedArray::build_and_encode_to(entries, writer)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::dictionary::Dictionary;
    use crate::entry::{Entry, Form, Reading};
    use crate::Result;

    #[test]
    fn write_then_read_dictionary_with_single_entry() -> Result<()> {
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
        let mut buffer = Vec::with_capacity(1024);
        Dictionary::<Vec<u8>>::build_and_encode_to(&[entry.clone()], &mut buffer)?;
        let dict = Dictionary::try_decode(buffer)?;

        let view = dict.borrow_view();
        assert_eq!(view.entries.len(), 1);
        assert_eq!(view.entries.get(0)?, entry);

        let value = view.term_index.map.get("よみきり").unwrap();
        let idxes = view.term_index.parse_value(value)?;
        assert_eq!(idxes, vec![0]);
        Ok(())
    }
}