use crate::entry::{Entry, Form, PartOfSpeech, Reading, Sense};
use itertools::Itertools;
use yomikiri_jmdict::{JMEntry, JMForm, JMReading, JMSense};

trait IterInto<T> {
    fn iter_into(self) -> Vec<T>;
}

impl<F, T> IterInto<T> for Vec<F>
where
    T: From<F>,
{
    fn iter_into(self) -> Vec<T> {
        self.into_iter().map(|e| e.into()).collect()
    }
}

impl From<JMEntry> for Entry<'static> {
    fn from(jm_entry: JMEntry) -> Entry<'static> {
        let priority = jm_entry.priority();
        let forms: Vec<Form> = jm_entry.forms.iter_into();
        let readings: Vec<Reading> = jm_entry.readings.iter_into();
        let senses: Vec<Sense> = jm_entry.senses.iter_into();
        Entry {
            forms,
            readings,
            senses,
            priority,
        }
    }
}

impl From<JMForm> for Form<'static> {
    fn from(jm_form: JMForm) -> Self {
        let uncommon = jm_form.is_uncommon();
        Form {
            form: jm_form.form.into(),
            info: jm_form.info.iter_into(),
            uncommon,
        }
    }
}

impl From<JMReading> for Reading<'static> {
    fn from(jm_reading: JMReading) -> Self {
        let uncommon = jm_reading.is_uncommon();
        Reading {
            reading: jm_reading.reading.into(),
            nokanji: jm_reading.nokanji.into(),
            to_form: jm_reading.to_form.iter_into(),
            info: jm_reading.info.iter_into(),
            uncommon,
        }
    }
}

impl From<JMSense> for Sense<'static> {
    fn from(jm_sense: JMSense) -> Self {
        Sense {
            to_form: jm_sense.to_form.iter_into(),
            to_reading: jm_sense.to_reading.iter_into(),
            pos: jm_sense
                .part_of_speech
                .iter()
                .map(|s| parse_part_of_speech(s))
                .unique()
                .collect(),
            misc: jm_sense.misc.iter_into(),
            info: jm_sense.info.iter_into(),
            dialect: jm_sense.dialect.iter_into(),
            meaning: jm_sense.meaning.iter_into(),
        }
    }
}

fn parse_part_of_speech(value: &str) -> PartOfSpeech {
    // strip '=' from '=XXX='
    let value = &value[1..value.len() - 1];
    match value {
        "n" | "adj-no" | "adj-f" | "num" | "vs" => PartOfSpeech::Noun,
        "adv" | "adv-to" | "vs-c" | "vs-i" => PartOfSpeech::Adverb,
        "conj" => PartOfSpeech::Conjunction,
        "int" => PartOfSpeech::Interjection,
        "suf" | "n-suf" | "ctr" => PartOfSpeech::Suffix,
        "prt" => PartOfSpeech::Particle,
        "adj-i" | "adj-ix" => PartOfSpeech::Adjective,
        "adj-na" | "adj-t" | "adj-nari" => PartOfSpeech::NaAdjective,
        "aux-v" | "aux" | "aux-adj" | "cop" => PartOfSpeech::AuxiliaryVerb,
        "pn" => PartOfSpeech::Pronoun,
        "pref" => PartOfSpeech::Prefix,
        "adj-pn" => PartOfSpeech::Adnomial,
        "exp" => PartOfSpeech::Expression,
        "unc" => PartOfSpeech::Unclassified,
        s if s.starts_with('v') => PartOfSpeech::Verb,
        s if s.starts_with("adj-") => PartOfSpeech::Adjective,
        s if s.starts_with("n-") => PartOfSpeech::Noun,
        other => panic!("Unknown part of speech: {}", other),
    }
}
