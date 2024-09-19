use std::io::BufRead;

use crate::entry::{
    GroupedSense, Kanji, PartOfSpeech, Rarity, Reading, Sense, WordEntry, WordEntryInner,
};
use crate::{Error, Result};
use yomikiri_jmdict::jmdict::{JMEntry, JMKanji, JMKanjiInfo, JMReading, JMReadingInfo, JMSense};
use yomikiri_jmdict::JMDictParser;

/// Skips entries that are from jmnedict
pub fn parse_jmdict_xml<R: BufRead>(reader: R) -> Result<Vec<WordEntry>> {
    let mut parser = JMDictParser::new(reader)?;
    let mut entries = vec![];
    while let Some(entry) = parser.next_entry()? {
        if entry.id < 5000000 || entry.id >= 6000000 {
            entries.push(WordEntry::try_from(entry)?)
        }
    }

    Ok(entries)
}

impl TryFrom<JMEntry> for WordEntry {
    type Error = Error;

    fn try_from(jm_entry: JMEntry) -> Result<WordEntry> {
        let priority = jm_entry.priority();
        let kanjis: Vec<Kanji> = jm_entry.kanjis.into_iter().map(Kanji::from).collect();
        let readings: Vec<Reading> = jm_entry.readings.into_iter().map(Reading::from).collect();
        let grouped_senses: Vec<GroupedSense> = group_senses(jm_entry.senses);
        let inner = WordEntryInner {
            id: jm_entry.id,
            kanjis,
            readings,
            grouped_senses,
            priority,
        };
        WordEntry::new(inner)
    }
}

impl From<JMKanji> for Kanji {
    fn from(value: JMKanji) -> Self {
        let rarity = value
            .info
            .iter()
            .filter_map(Rarity::from_kanji)
            .min()
            .unwrap_or(Rarity::Normal);

        Self {
            rarity,
            kanji: value.kanji,
        }
    }
}

impl From<JMReading> for Reading {
    fn from(jm_reading: JMReading) -> Self {
        let rarity = jm_reading
            .info
            .iter()
            .filter_map(Rarity::from_reading)
            .min()
            .unwrap_or(Rarity::Normal);

        Reading {
            reading: jm_reading.reading,
            nokanji: jm_reading.nokanji,
            rarity,
            to_kanji: jm_reading.to_form,
        }
    }
}

impl Rarity {
    fn from_kanji(info: &JMKanjiInfo) -> Option<Rarity> {
        use JMKanjiInfo::*;
        use Rarity::*;

        match *info {
            IrregularKana | IrregularKanji | IrregularOkurigana => Some(Incorrect),
            OutdatedKanji => Some(Outdated),
            RareKanjiForm => Some(Rare),
            SearchOnlyKanji => Some(Search),
            _ => None,
        }
    }

    fn from_reading(info: &JMReadingInfo) -> Option<Rarity> {
        use JMReadingInfo::*;
        use Rarity::*;

        match *info {
            Irregular => Some(Incorrect),
            JMReadingInfo::Outdated => Some(Rarity::Outdated),
            JMReadingInfo::Rare => Some(Rarity::Rare),
            SearchOnly => Some(Search),
            _ => None,
        }
    }
}

impl From<JMSense> for Sense {
    fn from(jm_sense: JMSense) -> Self {
        Sense {
            to_kanji: jm_sense.to_form,
            to_reading: jm_sense.to_reading,
            misc: jm_sense.misc,
            info: jm_sense.info,
            dialects: jm_sense.dialects,
            meanings: jm_sense.meanings,
        }
    }
}

fn group_senses(values: Vec<JMSense>) -> Vec<GroupedSense> {
    let mut groups: Vec<GroupedSense> = vec![];
    for value in values {
        let pos = PartOfSpeech::from_jmdict(&value.pos);
        let sense = Sense::from(value);
        insert_into_grouped_senses(&mut groups, pos, sense);
    }
    groups
}

fn insert_into_grouped_senses(
    groups: &mut Vec<GroupedSense>,
    pos: Vec<PartOfSpeech>,
    sense: Sense,
) {
    for group in groups.iter_mut() {
        if group.pos == pos {
            group.senses.push(sense);
            return;
        }
    }
    let group = GroupedSense {
        pos,
        senses: vec![sense],
    };
    groups.push(group);
}
