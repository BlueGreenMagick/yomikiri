use std::collections::HashMap;

use yomikiri_jmdict::jmdict::JMSenseMisc;
use yomikiri_jmdict::jmnedict::{JMneKanji, JMneNameType, JMneReading, JMneTranslation};

use crate::entry::{GroupedSense, Rarity, WordEntryInner};
use crate::name::{GroupedNameItem, NameEntry, NameItem, NameType};
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

/// Parses JMnedict xml and returns (Vec<NameEntry>, Vec<Entry[]>)
/// where the second `Entry[]` is treated as a 'word entry'.
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
pub fn parse_jmnedict_xml(xml: &str) -> Result<(Vec<NameEntry>, Vec<WordEntry>)> {
    let mut fragments: HashMap<NameEntryKanji, Vec<NameEntryFragmentValue>> = HashMap::new();
    let mut name_entries: Vec<NameEntry> = vec![];
    let mut word_entries: Vec<WordEntry> = vec![];
    let jmnedict = yomikiri_jmdict::jmnedict::parse_jmnedict_xml(xml)?;

    for entry in jmnedict.entries {
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
                        if !fragments.contains_key(&kanji.kanji) {
                            fragments.insert(kanji.kanji.clone(), vec![]);
                        }
                        fragments
                            .get_mut(&kanji.kanji)
                            .unwrap()
                            .push(fragment_value)
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
    }

    for (kanji, values) in fragments {
        let mut groups: Vec<GroupedNameItem> = vec![];
        for val in values {
            for grp in &mut groups {
                if grp.types == val.name_type {
                    grp.items.push(NameItem {
                        id: val.id,
                        reading: val.reading,
                    });
                    break;
                }
            }
        }
        let name_entry = NameEntry { kanji, groups };
        name_entries.push(name_entry);
    }

    Ok((name_entries, word_entries))
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
