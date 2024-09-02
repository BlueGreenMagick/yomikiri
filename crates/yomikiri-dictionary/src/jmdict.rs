use crate::entry::{Entry, GroupedSense, Kanji, PartOfSpeech, Rarity, Reading, Sense};
use crate::Result;
use yomikiri_jmdict::jmdict::{JMEntry, JMForm, JMKanjiInfo, JMReading, JMReadingInfo, JMSense};

pub fn parse_jmdict_xml(xml: &str) -> Result<Vec<Entry>> {
    let jmdict = yomikiri_jmdict::parse_jmdict_xml(xml)?;
    let entries = jmdict.entries.into_iter().map(Entry::from).collect();
    Ok(entries)
}

impl From<JMEntry> for Entry {
    fn from(jm_entry: JMEntry) -> Entry {
        let priority = jm_entry.priority();
        let kanjis: Vec<Kanji> = jm_entry.forms.into_iter().map(Kanji::from).collect();
        let readings: Vec<Reading> = jm_entry.readings.into_iter().map(Reading::from).collect();
        let grouped_senses: Vec<GroupedSense> = group_senses(jm_entry.senses);
        Entry {
            id: jm_entry.id,
            kanjis,
            readings,
            grouped_senses,
            priority,
        }
    }
}

impl From<JMForm> for Kanji {
    fn from(value: JMForm) -> Self {
        let rarity = value
            .info
            .iter()
            .map(Rarity::from_kanji)
            .flatten()
            .min()
            .unwrap_or(Rarity::Normal);

        Self {
            rarity,
            kanji: value.form,
        }
    }
}

impl From<JMReading> for Reading {
    fn from(jm_reading: JMReading) -> Self {
        let rarity = jm_reading
            .info
            .iter()
            .map(Rarity::from_reading)
            .flatten()
            .min()
            .unwrap_or(Rarity::Normal);

        Reading {
            reading: jm_reading.reading,
            nokanji: jm_reading.nokanji,
            rarity,
            constrain: jm_reading.to_form,
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
        let mut constrain = jm_sense.to_form;
        constrain.extend_from_slice(&jm_sense.to_reading);
        Sense {
            constrain,
            misc: jm_sense.misc,
            info: jm_sense.info,
            dialects: jm_sense.dialect,
            meanings: jm_sense.meaning,
        }
    }
}

fn group_senses(values: Vec<JMSense>) -> Vec<GroupedSense> {
    let mut groups: Vec<GroupedSense> = vec![];
    for value in values {
        let pos = value
            .part_of_speech
            .iter()
            .map(|p| PartOfSpeech(*p))
            .collect();
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
        if group.part_of_speech == pos {
            group.senses.push(sense);
            return;
        }
    }
    let group = GroupedSense {
        part_of_speech: pos,
        senses: vec![sense],
    };
    groups.push(group);
}
