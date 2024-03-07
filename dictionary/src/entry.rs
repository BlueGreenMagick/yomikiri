use serde::{Deserialize, Serialize};

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone)]
pub struct Entry {
    #[serde(rename = "f", default, skip_serializing_if = "Vec::is_empty")]
    pub forms: Vec<Form>,
    #[serde(rename = "r")]
    pub readings: Vec<Reading>,
    #[serde(rename = "s")]
    pub senses: Vec<Sense>,
    #[serde(rename = "p", default, skip_serializing_if = "is_zero")]
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

    pub fn main_form(&self) -> String {
        for form in &self.forms {
            if !form.uncommon {
                return form.form.clone();
            }
        }
        for reading in &self.readings {
            if !reading.uncommon {
                return reading.reading.clone();
            }
        }
        if !self.forms.is_empty() {
            return self.forms[0].form.clone();
        }
        if !self.readings.is_empty() {
            return self.readings[0].reading.clone();
        }

        "".into()
    }

    pub fn reading_for_form(&self, form: &str) -> Option<&Reading> {
        self.readings.iter().find(|reading| {
            (reading.to_form.is_empty() || reading.to_form.iter().any(|f| f == form))
                && !reading.nokanji
        })
    }
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone)]
pub struct Form {
    #[serde(rename = "f")]
    pub form: String,
    #[serde(rename = "i", default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<String>,
    #[serde(rename = "u", default, skip_serializing_if = "is_false")]
    pub uncommon: bool,
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize, Clone)]
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

/// Unidic based pos tagging
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize, Clone, Copy, Hash)]
pub enum PartOfSpeech {
    /// 名詞
    #[serde(rename = "n")]
    Noun,
    /// 動詞
    #[serde(rename = "v")]
    Verb,
    /// 形容詞
    #[serde(rename = "a")]
    Adjective,
    /// 形容動詞 / 形状詞 (unidic)
    #[serde(rename = "na")]
    NaAdjective,
    /// 助詞
    #[serde(rename = "p")]
    Particle,
    /// 副詞
    #[serde(rename = "av")]
    Adverb,
    /// 感動詞
    #[serde(rename = "i")]
    Interjection,
    /// 接尾辞
    #[serde(rename = "sf")]
    Suffix,
    /// 助動詞
    #[serde(rename = "ax")]
    AuxiliaryVerb,
    /// 代名詞
    #[serde(rename = "pn")]
    Pronoun,
    /// 接続詞
    #[serde(rename = "c")]
    Conjunction,
    /// 接頭辞
    #[serde(rename = "pf")]
    Prefix,
    /// 連体詞
    #[serde(rename = "ad")]
    Adnomial,
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
    !*a
}

fn is_zero(a: &u16) -> bool {
    *a == 0
}
