use crate::entry::{Entry, Kanji, PartOfSpeech, Reading, Sense};
use crate::Result;
use itertools::Itertools;
use yomikiri_jmdict::jmdict::{JMEntry, JMForm, JMReading, JMSense};

pub fn parse_jmdict_xml(xml: &str) -> Result<Vec<Entry>> {
    let jmdict = yomikiri_jmdict::parse_jmdict_xml(xml)?;
    let entries = jmdict.entries.into_iter().map(Entry::from).collect();
    Ok(entries)
}

impl From<JMEntry> for Entry {
    fn from(jm_entry: JMEntry) -> Entry {
        let priority = jm_entry.priority();
        let forms: Vec<Form> = jm_entry.forms.into_iter().map(Form::from).collect();
        let readings: Vec<Reading> = jm_entry.readings.into_iter().map(Reading::from).collect();
        let senses: Vec<Sense> = jm_entry.senses.into_iter().map(Sense::from).collect();
        Entry {
            forms,
            readings,
            senses,
            priority,
        }
    }
}

impl From<JMForm> for Form {
    fn from(jm_form: JMForm) -> Self {
        let uncommon = jm_form.is_uncommon();
        Form {
            form: jm_form.form,
            info: jm_form.info,
            uncommon,
        }
    }
}

impl From<JMReading> for Reading {
    fn from(jm_reading: JMReading) -> Self {
        let uncommon = jm_reading.is_uncommon();
        Reading {
            reading: jm_reading.reading,
            nokanji: jm_reading.nokanji,
            to_form: jm_reading.to_form,
            info: jm_reading.info,
            uncommon,
        }
    }
}

impl From<JMSense> for Sense {
    fn from(jm_sense: JMSense) -> Self {
        Sense {
            to_form: jm_sense.to_form,
            to_reading: jm_sense.to_reading,
            pos: jm_sense
                .part_of_speech
                .iter()
                .map(|s| parse_part_of_speech(s))
                .unique()
                .collect(),
            misc: jm_sense.misc,
            info: jm_sense.info,
            dialect: jm_sense.dialect,
            meaning: jm_sense.meaning,
        }
    }
}
