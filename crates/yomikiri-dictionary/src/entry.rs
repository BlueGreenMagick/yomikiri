//! Contains dictionary entry struct
//!
//! `Serialize`, `Deserialize`, `Tsify` is used when passing to web
//! `Decode`, `Encode` is used to encode the structs into the dictionary file

use serde::{Deserialize, Serialize};
use yomikiri_jmdict::jmdict::JMSenseMisc;
use yomikiri_unidic_types::{
    UnidicAdjectivePos2, UnidicInterjectionPos2, UnidicNaAdjectivePos2, UnidicNounPos2,
    UnidicParticlePos2, UnidicPos, UnidicSuffixPos2, UnidicSymbolPos2, UnidicVerbPos2,
};

#[cfg(feature = "wasm")]
use tsify_next::Tsify;

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Entry {
    pub id: u32,
    pub kanjis: Vec<Kanji>,
    pub readings: Vec<Reading>,
    pub grouped_senses: Vec<GroupedSense>,
    pub priority: u16,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
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
    pub constrain: Vec<String>,
    pub rarity: Rarity,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
enum Rarity {
    Normal,
    Rare,
    Outdated,
    Incorrect,
    Search,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GroupedSense {
    part_of_speech: Vec<PartOfSpeech>,
    senses: Vec<Sense>,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sense {
    // to_kanji or to_reading
    pub constrain: Vec<String>,
    pub pos: Vec<PartOfSpeech>,
    pub misc: Vec<JMSenseMisc>,
    pub info: Vec<String>,
    pub dialects: Vec<String>,
    pub meanings: Vec<String>,
}

/// Unidic based pos tagging
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PartOfSpeech {
    /// 名詞
    Noun,
    /// 動詞
    Verb,
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

impl PartOfSpeech {
    pub fn to_unidic(&self) -> UnidicPos {
        match &self {
            PartOfSpeech::Noun => UnidicPos::Noun(UnidicNounPos2::Unknown),
            PartOfSpeech::Verb => UnidicPos::Verb(UnidicVerbPos2::Unknown),
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

impl From<UnidicPos> for PartOfSpeech {
    fn from(value: UnidicPos) -> Self {
        match value {
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
