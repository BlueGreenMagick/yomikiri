use serde::{Deserialize, Serialize};

/// largest entry binary size is 2592
pub const ENTRY_BUFFER_SIZE: usize = 3600;

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Entry {
    #[serde(rename = "f", default, skip_serializing_if = "Vec::is_empty")]
    pub forms: Vec<Form>,
    #[serde(rename = "r")]
    pub readings: Vec<Reading>,
    #[serde(rename = "s")]
    pub senses: Vec<Sense>,
    #[serde(rename = "p")]
    pub priority: u16,
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

    pub fn is_expression(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.pos.iter().any(|p| *p == PartOfSpeech::Expression))
    }

    pub fn is_noun(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.pos.iter().any(|p| *p == PartOfSpeech::Noun))
    }

    pub fn is_particle(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.pos.iter().any(|p| *p == PartOfSpeech::Particle))
    }

    pub fn is_conjunction(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.pos.iter().any(|p| *p == PartOfSpeech::Conjunction))
    }
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Form {
    #[serde(rename = "f")]
    pub form: String,
    #[serde(rename = "i", default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<String>,
    #[serde(rename = "u", default, skip_serializing_if = "is_false")]
    pub uncommon: bool,
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Reading {
    #[serde(rename = "r")]
    pub reading: String,
    #[serde(rename = "nk", default, skip_serializing_if = "is_false")]
    pub nokanji: bool,
    #[serde(rename = "tf", default, skip_serializing_if = "Vec::is_empty")]
    pub to_form: Vec<String>,
    #[serde(rename = "i", default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<String>,
    #[serde(rename = "u", default, skip_serializing_if = "is_false")]
    pub uncommon: bool,
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Sense {
    #[serde(rename = "tf", default, skip_serializing_if = "Vec::is_empty")]
    pub to_form: Vec<String>,
    #[serde(rename = "tr", default, skip_serializing_if = "Vec::is_empty")]
    pub to_reading: Vec<String>,
    #[serde(rename = "p", default, skip_serializing_if = "Vec::is_empty")]
    pub pos: Vec<PartOfSpeech>,
    #[serde(rename = "mc", default, skip_serializing_if = "Vec::is_empty")]
    pub misc: Vec<String>,
    #[serde(rename = "i", default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<String>,
    #[serde(rename = "d", default, skip_serializing_if = "Vec::is_empty")]
    pub dialect: Vec<String>,
    #[serde(rename = "m", default, skip_serializing_if = "Vec::is_empty")]
    pub meaning: Vec<String>,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize, Clone, Copy, Hash)]
pub enum PartOfSpeech {
    #[serde(rename = "n")]
    Noun,
    #[serde(rename = "v")]
    Verb,
    #[serde(rename = "a")]
    Adjective,
    #[serde(rename = "p")]
    Particle,
    #[serde(rename = "av")]
    Adverb,
    #[serde(rename = "ax")]
    Auxiliary,
    #[serde(rename = "cj")]
    Conjunction,
    #[serde(rename = "cp")]
    Copula,
    #[serde(rename = "pn")]
    Pronoun,
    #[serde(rename = "nm")]
    Numeric,
    #[serde(rename = "pf")]
    Prefix,
    #[serde(rename = "sf")]
    Suffix,
    #[serde(rename = "cn")]
    Counter,
    #[serde(rename = "in")]
    Interjection,
    #[serde(rename = "e")]
    Expression,
    #[serde(rename = "u")]
    Unclassified,
}

#[derive(Debug, Eq, Serialize, Deserialize)]
pub struct DictIndexItem {
    pub key: String,
    pub offsets: Vec<u32>,
    pub sizes: Vec<u16>,
}

impl DictIndexItem {
    pub fn new(key: String, offset: u32, size: u16) -> DictIndexItem {
        DictIndexItem {
            key,
            offsets: vec![offset],
            sizes: vec![size],
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
