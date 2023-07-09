use serde::{Deserialize, Serialize};

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Entry {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub forms: Vec<Form>,
    pub readings: Vec<Reading>,
    pub senses: Vec<Sense>,
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
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Form {
    pub form: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<String>,
    #[serde(default, skip_serializing_if = "is_false")]
    pub uncommon: bool,
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
