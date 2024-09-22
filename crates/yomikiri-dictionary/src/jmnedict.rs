use std::collections::HashMap;

use yomikiri_jmdict::jmdict::JMSenseMisc;
use yomikiri_jmdict::jmnedict::{JMneEntry, JMneKanji, JMneNameType, JMneReading, JMneTranslation};

use crate::entry::{
    GroupedNameItem, GroupedSense, NameEntry, NameItem, NameType, Rarity, WordEntryInner,
};
use crate::{Kanji, PartOfSpeech, Reading, Result, Sense, WordEntry};

type NameEntryKanji = String;

#[derive(Debug, Clone, PartialEq, Eq)]
struct NameEntryFragmentValue {
    id: u32,
    reading: String,
    // TODO: Instead of having a vector everywhere, reuse combinations.
    name_type: Vec<NameType>,
    priority: u16,
}

#[derive(Debug, Clone)]
pub(crate) struct NameEntriesBuilder {
    fragments: HashMap<NameEntryKanji, Vec<NameEntryFragmentValue>>,
}

impl NameEntriesBuilder {
    /// 234561 (jmnedict: 2024-08-29, calculated: 2024-09-22)
    pub const ENTRIES_CAPACITY: usize = 250000;

    pub fn new() -> Self {
        Self {
            fragments: HashMap::with_capacity(Self::ENTRIES_CAPACITY),
        }
    }

    fn add_fragment(&mut self, kanji: &String, fragment_value: NameEntryFragmentValue) {
        if !self.fragments.contains_key(kanji) {
            self.fragments.insert(kanji.clone(), vec![]);
        }
        self.fragments.get_mut(kanji).unwrap().push(fragment_value)
    }

    pub fn into_iter(self) -> impl Iterator<Item = NameEntry> {
        // println!("name_entries.len() = {}", self.fragments.len());
        self.fragments.into_iter().map(|(kanji, values)| {
            let mut groups: Vec<GroupedNameItem> = vec![];
            for val in values {
                let name_item = NameItem {
                    id: val.id,
                    reading: val.reading,
                };
                if let Some(grp) = groups.iter_mut().find(|grp| grp.types == val.name_type) {
                    grp.items.push(name_item);
                } else {
                    groups.push(GroupedNameItem {
                        types: val.name_type,
                        items: vec![name_item],
                    })
                }
            }
            NameEntry { kanji, groups }
        })
    }
}

/// Parses JMnedict entry and adds 0 or 1 new WordEntry and n NameEntryFragments
///
/// A `JMneTranslation` entry either creates (multiple) `NameItem`, or one `Sense` in `Entry`, not both.
///
/// A `NameEntry` is created for JMnedict entry with at least 1 kanji, and is a 'name-type' (of a person)
/// where its translation is only a transliteration of the reading.
///
/// Whether a `JMneTranslation` is a 'name-type' is determined by its `name_type` property.
/// 4 variants `Forename`, `Surname`, `Female`, `Male` are considered name-type, and creates `NameItem`.
/// Other variants create a `Sense` in a `Entry`.
///
/// If `name_type` of `JMneTranslation` has types of both kind, then
///     - If it is `Person` with `Female` or `Male`, only a WordItem is created, and `Female` / `Male` is ignored.
///       The gender tag seems to be mistagged here to only indicate the person's gender, instead of the forename + gender info.
///     - For other tag combinations, we only create `NameItem`, as it's a transliteration anyway.
pub(crate) fn parse_jmnedict_entry(
    word_entries: &mut Vec<WordEntry>,
    name_builder: &mut NameEntriesBuilder,
    entry: JMneEntry,
) -> Result<()> {
    let mut for_names: Vec<JMneTranslation> = vec![];
    let mut for_words: Vec<JMneTranslation> = vec![];
    if entry.kanjis.is_empty() {
        for_words.extend(entry.translations);
    } else {
        for translation_obj in entry.translations {
            if is_name_type(&translation_obj.name_type) {
                for_names.push(translation_obj);
            } else {
                for_words.push(translation_obj);
            }
        }
    }

    if !for_names.is_empty() {
        for kanji in &entry.kanjis {
            for reading in &entry.readings {
                if !reading.is_for_kanji(&kanji.kanji) {
                    continue;
                }
                for trans_obj in &for_names {
                    let fragment_value = NameEntryFragmentValue {
                        id: entry.id,
                        reading: reading.reading.clone(),
                        name_type: trans_obj.name_type.clone(),
                        priority: 0, // TODO: Set priority info
                    };
                    name_builder.add_fragment(&kanji.kanji, fragment_value);
                }
            }
        }
    }

    if !for_words.is_empty() {
        let inner =
            WordEntryInner::from_jmnedict(entry.id, &entry.kanjis, &entry.readings, &for_words);
        let entry = WordEntry::new(inner)?;
        word_entries.push(entry);
    }
    Ok(())
}

/// Returns `true` if it is a 'name-type' suitable for a NameEntry.
fn is_name_type(name_types: &[JMneNameType]) -> bool {
    let mut has_fore_surname = false;
    let mut has_gender = false;
    let mut has_person = false;
    for kind in name_types {
        match kind {
            JMneNameType::Forename | JMneNameType::Surname => {
                has_fore_surname = true;
            }
            JMneNameType::Female | JMneNameType::Male => {
                has_gender = true;
            }
            JMneNameType::Person => {
                has_person = true;
            }
            _ => {}
        };
    }

    if has_gender && has_person {
        false
    } else {
        has_fore_surname || has_gender
    }
}

impl WordEntryInner {
    fn from_jmnedict(
        id: u32,
        kanjis: &[JMneKanji],
        readings: &[JMneReading],
        translations: &[JMneTranslation],
    ) -> WordEntryInner {
        let kanjis = kanjis
            .iter()
            .map(|k| Kanji {
                kanji: k.kanji.clone(),
                rarity: Rarity::Normal,
            })
            .collect();
        let readings = readings
            .iter()
            .map(|r| Reading {
                reading: r.reading.clone(),
                to_kanji: r.to_kanji.clone(),
                nokanji: false,
                rarity: Rarity::Normal,
            })
            .collect();
        let grouped_senses = vec![GroupedSense {
            pos: vec![PartOfSpeech::Noun],
            senses: translations
                .iter()
                .map(|t| Sense {
                    meanings: t.translations.clone(),
                    to_kanji: vec![],
                    to_reading: vec![],
                    misc: t.name_type.iter().map(|t| JMSenseMisc::from(*t)).collect(),
                    info: vec![],
                    dialects: vec![],
                })
                .collect(),
        }];

        WordEntryInner {
            id,
            kanjis,
            readings,
            grouped_senses,
            priority: 0, // TODO: Calculate priority from entry
        }
    }
}
