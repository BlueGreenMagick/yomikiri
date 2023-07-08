use serde::{Deserialize, Serialize};

use crate::jmdict::{JMEntry, JMForm, JMReading, JMSense};

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Entry {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub forms: Vec<Form>,
    pub readings: Vec<Reading>,
    pub senses: Vec<Sense>,
    pub priority: u16,
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

impl Entry {
    pub fn terms(&self) -> Vec<&str> {
        let mut terms: Vec<&str> = vec![];
        for form in &self.forms {
            terms.push(&form.form);
        }
        for reading in &self.readings {
            terms.push(&reading.reading);
        }
        terms
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

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Form {
    pub form: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<String>,
    #[serde(default, skip_serializing_if = "is_false")]
    pub uncommon: bool,
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

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Reading {
    pub reading: String,
    #[serde(default, skip_serializing_if = "is_false")]
    pub nokanji: bool,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub to_form: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<String>,
    #[serde(default, skip_serializing_if = "is_false")]
    pub uncommon: bool,
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

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Sense {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub to_form: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub to_reading: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub part_of_speech: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub misc: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub dialect: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub meaning: Vec<String>,
}

impl From<JMSense> for Sense {
    fn from(jm_sense: JMSense) -> Self {
        Sense {
            to_form: jm_sense.to_form,
            to_reading: jm_sense.to_reading,
            part_of_speech: jm_sense.part_of_speech,
            misc: jm_sense.misc,
            info: jm_sense.info,
            dialect: jm_sense.dialect,
            meaning: jm_sense.meaning,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Eq)]
pub struct DictIndexItem {
    pub key: String,
    pub offsets: Vec<u64>,
}

impl DictIndexItem {
    pub fn new(key: String, offset: u64) -> DictIndexItem {
        DictIndexItem {
            key,
            offsets: vec![offset],
        }
    }
}

impl Ord for DictIndexItem {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.key.cmp(&other.key)
    }
}

impl PartialOrd for DictIndexItem {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl PartialEq for DictIndexItem {
    fn eq(&self, other: &Self) -> bool {
        self.key == other.key
    }
}

fn is_false(a: &bool) -> bool {
    return !*a;
}
