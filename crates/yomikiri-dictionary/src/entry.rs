//! Contains dictionary entry struct
//!
//! `Serialize`, `Deserialize`, `Tsify` is used when passing to web
//! `Decode`, `Encode` is used to encode the structs into the dictionary file

use std::ops::Deref;

use serde::de::Error as DeserializeError;
use serde::{Deserialize, Serialize};
use yomikiri_jmdict::jmdict::{JMDialect, JMPartOfSpeech, JMSenseMisc};
use yomikiri_unidic_types::{
    UnidicAdjectivePos2, UnidicInterjectionPos2, UnidicNaAdjectivePos2, UnidicNounPos2,
    UnidicParticlePos2, UnidicPos, UnidicSuffixPos2, UnidicSymbolPos2, UnidicVerbPos2,
};

#[cfg(feature = "wasm")]
use tsify_next::Tsify;

use crate::{Error, Result};

/// Constraints:
/// 1. Must have at least 1 reading
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(transparent)]
pub struct Entry(EntryInner);

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryInner {
    pub id: u32,
    pub kanjis: Vec<Kanji>,
    pub readings: Vec<Reading>,
    pub grouped_senses: Vec<GroupedSense>,
    pub priority: u16,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Kanji {
    pub kanji: String,
    pub rarity: Rarity,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    pub reading: String,
    /// This reading counts as term, not reading
    pub nokanji: bool,
    pub to_kanji: Vec<String>,
    pub rarity: Rarity,
}

/// Ordered by rarity.
/// `Normal` is the most common and `Search`` is the rarest.
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Rarity {
    Normal,
    Rare,
    Outdated,
    Incorrect,
    Search,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupedSense {
    pub pos: Vec<PartOfSpeech>,
    pub senses: Vec<Sense>,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sense {
    pub meanings: Vec<String>,
    pub to_kanji: Vec<String>,
    pub to_reading: Vec<String>,
    pub misc: Vec<JMSenseMisc>,
    pub info: Vec<String>,
    pub dialects: Vec<JMDialect>,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PartOfSpeech {
    /// 名詞
    Noun,
    /// 動詞
    Verb,
    // する-verb / サ変動詞語幹 / サ変可能　(unidic)
    #[serde(rename = "suru verb")]
    SuruVerb,
    /// 形容詞
    Adjective,
    /// 形容動詞 / 形状詞 (unidic)
    #[serde(rename = "na-adjective")]
    NaAdjective,
    /// 助詞
    Particle,
    /// 副詞
    Adverb,
    /// 感動詞
    Interjection,
    /// 接尾辞
    Suffix,
    /// 助動詞
    #[serde(rename = "auxiliary verb")]
    AuxiliaryVerb,
    /// 代名詞
    Pronoun,
    /// 接続詞
    Conjunction,
    /// 接頭辞
    Prefix,
    /// 連体詞
    Adnomial,
    Expression,
    Unclassified,
    /// Represents symbol pos from unidic
    Symbol,
}

impl From<&JMPartOfSpeech> for PartOfSpeech {
    fn from(pos: &JMPartOfSpeech) -> Self {
        use JMPartOfSpeech::*;

        match *pos {
            Adverb | AdverbTo => PartOfSpeech::Adverb,
            Conjunction => PartOfSpeech::Conjunction,
            Interjection => PartOfSpeech::Interjection,
            Suffix | SuffixNoun | Counter => PartOfSpeech::Suffix,
            Particle => PartOfSpeech::Particle,
            NaAdjectivalNoun | AdjectiveTaru | NaAdjectiveNari => PartOfSpeech::NaAdjective,
            AuxiliaryVerb | Auxiliary | AuxiliaryAdjective | Copula => PartOfSpeech::AuxiliaryVerb,
            Pronoun => PartOfSpeech::Pronoun,
            Prefix => PartOfSpeech::Prefix,
            PrenounAdjectival => PartOfSpeech::Adnomial,
            Expression => PartOfSpeech::Expression,
            Unclassified => PartOfSpeech::Unclassified,
            Noun | NounNo | PrenominalNounOrVerb | Numeric | AdverbialNoun | ProperNoun
            | PrefixNoun | TemporalNoun => PartOfSpeech::Noun,
            UnspecifiedVerb | VerbIchidan | VerbIchidanKureru | VerbNidanU | VerbNidanBK
            | VerbNidanBS | VerbNidanDK | VerbNidanDS | VerbNidanGK | VerbNidanGS | VerbNidanHK
            | VerbNidanHS | VerbNidanKK | VerbNidanKS | VerbNidanMK | VerbNidanMS | VerbNidanNS
            | VerbNidanRK | VerbNidanRS | VerbNidanSS | VerbNidanTK | VerbNidanTS | VerbNidanWS
            | VerbNidanYK | VerbNidanYS | VerbNidanZS | VerbYodanB | VerbYodanG | VerbYodanH
            | VerbYodanK | VerbYodanM | VerbYodanN | VerbYodanR | VerbYodanS | VerbYodanT
            | VerbGodanAru | VerbGodanB | VerbGodanG | VerbGodanK | VerbGodanKS | VerbGodanM
            | VerbGodanN | VerbGodanR | VerbGodanRI | VerbGodanS | VerbGodanT | VerbGodanU
            | VerbGodanUS | VerbGodanUru | IntransitiveVerb | VerbKuru | VerbNu | VerbRu
            | VerbTransitive | VerbIchidanZ => PartOfSpeech::Verb,
            Adjective | AdjectiveYoiOrIi | AdjectiveKari | AdjectiveKu | AdjectiveShiku => {
                PartOfSpeech::Adjective
            }
            VerbSuru | VerbSu | VerbSuruIncluded | VerbSuruSpecial => PartOfSpeech::SuruVerb,
        }
    }
}

impl From<&UnidicPos> for PartOfSpeech {
    fn from(value: &UnidicPos) -> Self {
        match *value {
            UnidicPos::Noun(_) => PartOfSpeech::Noun,
            UnidicPos::Verb(_) => PartOfSpeech::Verb,
            UnidicPos::Adjective(_) => PartOfSpeech::Adjective,
            UnidicPos::NaAdjective(_) => PartOfSpeech::NaAdjective,
            UnidicPos::Particle(_) => PartOfSpeech::Particle,
            UnidicPos::Adverb => PartOfSpeech::Adverb,
            UnidicPos::Interjection(_) => PartOfSpeech::Interjection,
            UnidicPos::Suffix(_) => PartOfSpeech::Suffix,
            UnidicPos::AuxVerb => PartOfSpeech::AuxiliaryVerb,
            UnidicPos::Pronoun => PartOfSpeech::Pronoun,
            UnidicPos::Conjunction => PartOfSpeech::Conjunction,
            UnidicPos::Prefix => PartOfSpeech::Prefix,
            UnidicPos::PrenounAdjectival => PartOfSpeech::Adnomial,
            UnidicPos::Expression => PartOfSpeech::Expression,
            UnidicPos::SupplementarySymbol(_) => PartOfSpeech::Symbol,
            UnidicPos::Whitespace => PartOfSpeech::Symbol,
            UnidicPos::Symbol(_) => PartOfSpeech::Symbol,
            UnidicPos::Unknown => PartOfSpeech::Unclassified,
        }
    }
}

impl PartOfSpeech {
    pub fn to_unidic(&self) -> UnidicPos {
        match *self {
            PartOfSpeech::Noun => UnidicPos::Noun(UnidicNounPos2::Unknown),
            PartOfSpeech::Verb => UnidicPos::Verb(UnidicVerbPos2::Unknown),
            // Most 'suru verbs' are nouns.
            PartOfSpeech::SuruVerb => UnidicPos::Noun(UnidicNounPos2::普通名詞),
            PartOfSpeech::Adjective => UnidicPos::Adjective(UnidicAdjectivePos2::Unknown),
            PartOfSpeech::NaAdjective => UnidicPos::NaAdjective(UnidicNaAdjectivePos2::Unknown),
            PartOfSpeech::Particle => UnidicPos::Particle(UnidicParticlePos2::Unknown),
            PartOfSpeech::Adverb => UnidicPos::Adverb,
            PartOfSpeech::Interjection => UnidicPos::Interjection(UnidicInterjectionPos2::Unknown),
            PartOfSpeech::Suffix => UnidicPos::Suffix(UnidicSuffixPos2::Unknown),
            PartOfSpeech::AuxiliaryVerb => UnidicPos::AuxVerb,
            PartOfSpeech::Pronoun => UnidicPos::Pronoun,
            PartOfSpeech::Conjunction => UnidicPos::Conjunction,
            PartOfSpeech::Prefix => UnidicPos::Prefix,
            PartOfSpeech::Adnomial => UnidicPos::PrenounAdjectival,
            PartOfSpeech::Expression => UnidicPos::Expression,
            PartOfSpeech::Unclassified => UnidicPos::Unknown,
            PartOfSpeech::Symbol => UnidicPos::Symbol(UnidicSymbolPos2::Unknown),
        }
    }
}

impl Entry {
    pub fn new(inner: EntryInner) -> Result<Self> {
        Self::validate_entry(&inner)?;
        Ok(Self(inner))
    }

    fn validate_entry(inner: &EntryInner) -> Result<()> {
        if inner.readings.is_empty() {
            return Err(Error::InvalidEntry(
                "Entry must contain at least 1 kanji or reading".into(),
            ));
        }
        Ok(())
    }

    pub fn main_reading(&self) -> &str {
        &self.readings.first().unwrap().reading
    }

    pub fn main_form(&self) -> &str {
        if let Some(kanji) = self.kanjis.first() {
            if kanji.rarity == Rarity::Normal {
                return &kanji.kanji;
            }
        }
        if let Some(reading) = self.readings.first() {
            if reading.rarity == Rarity::Normal {
                return &reading.reading;
            }
        }
        if let Some(kanji) = self.kanjis.first() {
            return &kanji.kanji;
        }
        self.main_reading()
    }

    pub fn has_pos(&self, pos: PartOfSpeech) -> bool {
        self.grouped_senses.iter().any(|g| g.pos.contains(&pos))
    }

    /// Get first reading that can be applied for kanji.
    pub fn reading_for_kanji(&self, kanji: &str) -> Option<&Reading> {
        self.readings.iter().find(|reading| {
            reading.to_kanji.is_empty() || reading.to_kanji.iter().any(|c| c == kanji)
        })
    }
}

impl Deref for Entry {
    type Target = EntryInner;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl<'de> Deserialize<'de> for Entry {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let inner = EntryInner::deserialize(deserializer)?;
        Self::validate_entry(&inner).map_err(D::Error::custom)?;

        Ok(Self(inner))
    }
}
