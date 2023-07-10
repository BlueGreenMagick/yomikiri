use serde::{Deserialize, Serialize};

// largest entry binary size is 3336
pub const ENTRY_BUFFER_SIZE: usize = 3600;

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

    pub fn is_expression(&self) -> bool {
        self.senses.iter().any(|s| {
            s.part_of_speech
                .iter()
                .any(|p| *p == PartOfSpeech::Expression)
        })
    }

    pub fn is_noun(&self) -> bool {
        self.senses
            .iter()
            .any(|s| s.part_of_speech.iter().any(|p| *p == PartOfSpeech::Noun))
    }

    pub fn is_particle(&self) -> bool {
        self.senses.iter().any(|s| {
            s.part_of_speech
                .iter()
                .any(|p| *p == PartOfSpeech::Particle)
        })
    }

    pub fn is_conjunction(&self) -> bool {
        self.senses.iter().any(|s| {
            s.part_of_speech
                .iter()
                .any(|p| *p == PartOfSpeech::Conjunction)
        })
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
    pub part_of_speech: Vec<PartOfSpeech>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub misc: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub info: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub dialect: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub meaning: Vec<String>,
}

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PartOfSpeech {
    Noun,
    Verb,
    Adjective,
    Adverb,
    Auxiliary,
    Conjunction,
    Copula,
    Pronoun,
    Numeric,
    Prefix,
    Particle,
    Suffix,
    Counter,
    Interjection,
    Expression,
    Unclassified,
}

#[derive(Debug, Eq)]
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

impl Serialize for DictIndexItem {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        (&self.key, &self.offsets, &self.sizes).serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for DictIndexItem {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let (key, offsets, sizes) = <(String, Vec<u32>, Vec<u16>)>::deserialize(deserializer)?;
        Ok(DictIndexItem {
            key,
            offsets,
            sizes,
        })
    }
}

fn is_false(a: &bool) -> bool {
    return !*a;
}
