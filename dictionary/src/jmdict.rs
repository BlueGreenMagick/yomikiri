use serde::Serialize;
use yomikiri_dictionary_types::{Entry, Form, PartOfSpeech, Reading, Sense};

#[derive(Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JMEntry {
    /// 0+ k_ele
    pub forms: Vec<JMForm>,
    /// 1+ r_ele
    pub readings: Vec<JMReading>,
    /// 1+ sense
    pub senses: Vec<JMSense>,
}

impl JMEntry {
    fn priority(&self) -> u16 {
        let priorities = &self.readings.get(0).unwrap().priority;
        let mut priority: u16 = 0;

        for p in priorities {
            // common ~20k entries
            if ["news1", "ichi1", "spec1", "gai1"].contains(&p.as_str()) {
                if priority < 100 {
                    priority += 100
                } else {
                    priority += 25
                }
            // common ~30k entries
            } else if ["news2", "ichi2", "spec2", "gai2"].contains(&p.as_str()) {
                priority += 5
            // 01 ~ 48, each with ~500 entries
            } else if p.starts_with("nf") {
                let freq = p[2..]
                    .parse::<u16>()
                    .expect("could not parse XX as number where priority nfXX");
                priority += 50 - freq;
            }
        }
        priority
    }
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

#[derive(Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JMForm {
    pub form: String,
    /// 0+ ke_inf
    pub info: Vec<String>,
    /// 0+ ke_pri
    pub priority: Vec<String>,
}

impl JMForm {
    fn is_uncommon(&self) -> bool {
        for f in ["=ok=", "=rK=", "=sK="] {
            if self.info.iter().any(|s| s == f) {
                return true;
            }
        }
        return false;
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

#[derive(Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JMReading {
    pub reading: String,
    pub nokanji: bool,
    /// 0+ re_restr
    pub to_form: Vec<String>,
    /// 0+ re_inf
    pub info: Vec<String>,
    /// 0+ re_pri
    pub priority: Vec<String>,
}

impl JMReading {
    fn is_uncommon(&self) -> bool {
        for f in ["=ok=", "=sk="] {
            if self.info.iter().any(|s| s == f) {
                return true;
            }
        }
        return false;
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

#[derive(Debug, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JMSense {
    /// 0+ 'stagk'
    pub to_form: Vec<String>,
    /// 0+ 'stagr'
    pub to_reading: Vec<String>,
    /// 'pos'
    pub part_of_speech: Vec<String>,
    /// 'xref'
    // pub reference: Vec<String>,
    /// 'ant'
    // pub antonym: Vec<String>,
    /// 'field'
    // pub field: Vec<String>,
    /// 'misc'
    pub misc: Vec<String>,
    /// 's_inf'
    pub info: Vec<String>,
    /// 'dial'
    pub dialect: Vec<String>,
    /// 'gloss'
    pub meaning: Vec<String>,
    // 'example'
    // example: Vec<Example>,
}

impl From<JMSense> for Sense {
    fn from(jm_sense: JMSense) -> Self {
        Sense {
            to_form: jm_sense.to_form,
            to_reading: jm_sense.to_reading,
            part_of_speech: jm_sense
                .part_of_speech
                .iter()
                .map(|s| parse_part_of_speech(s))
                .collect(),
            misc: jm_sense.misc,
            info: jm_sense.info,
            dialect: jm_sense.dialect,
            meaning: jm_sense.meaning,
        }
    }
}

fn parse_part_of_speech(value: &str) -> PartOfSpeech {
    // strip '=' from '=XXX='
    let value = &value[1..value.len() - 1];
    match value {
        "vs" | "n" => PartOfSpeech::Noun,
        "aux" => PartOfSpeech::Auxiliary,
        "aux-v" => PartOfSpeech::Verb,
        "aux-adj" => PartOfSpeech::Adjective,
        "adv" | "adv-to" => PartOfSpeech::Adverb,
        "int" => PartOfSpeech::Interjection,
        "conj" => PartOfSpeech::Conjunction,
        "cop" => PartOfSpeech::Copula,
        "ctr" => PartOfSpeech::Counter,
        "exp" => PartOfSpeech::Expression,
        "num" => PartOfSpeech::Numeric,
        "pn" => PartOfSpeech::Pronoun,
        "pref" => PartOfSpeech::Prefix,
        "prt" => PartOfSpeech::Particle,
        "suf" => PartOfSpeech::Suffix,
        "unc" => PartOfSpeech::Unclassified,
        s if s.starts_with("v") => PartOfSpeech::Verb,
        s if s.starts_with("adj-") => PartOfSpeech::Adjective,
        s if s.starts_with("n-") => PartOfSpeech::Noun,
        other => panic!("Unknown part of speech: {}", other),
    }
}
