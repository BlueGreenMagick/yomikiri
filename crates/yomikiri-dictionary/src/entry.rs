//! Contains dictionary entry struct
//!
//! `Serialize`, `Deserialize`, `Tsify` is used when passing to web
//! `Decode`, `Encode` is used to encode the structs into the dictionary file

use serde::{Deserialize, Serialize};
use yomikiri_jmdict::jmdict::{JMPartOfSpeech, JMSenseMisc};
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

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct PartOfSpeech(JMPartOfSpeech);

impl PartOfSpeech {
    fn pos_to_unidic(&self) -> UnidicPos {
        match &self.0 {
            JMPartOfSpeech::Noun => UnidicPos::Noun(UnidicNounPos2::Unknown),
            JMPartOfSpeech::Verb => UnidicPos::Verb(UnidicVerbPos2::Unknown),
            JMPartOfSpeech::Adjective => UnidicPos::Adjective(UnidicAdjectivePos2::Unknown),
            JMPartOfSpeech::NaAdjective => UnidicPos::NaAdjective(UnidicNaAdjectivePos2::Unknown),
            JMPartOfSpeech::Particle => UnidicPos::Particle(UnidicParticlePos2::Unknown),
            JMPartOfSpeech::Adverb => UnidicPos::Adverb,
            JMPartOfSpeech::Interjection => {
                UnidicPos::Interjection(UnidicInterjectionPos2::Unknown)
            }
            JMPartOfSpeech::Suffix => UnidicPos::Suffix(UnidicSuffixPos2::Unknown),
            JMPartOfSpeech::AuxiliaryVerb => UnidicPos::AuxVerb,
            JMPartOfSpeech::Pronoun => UnidicPos::Pronoun,
            JMPartOfSpeech::Conjunction => UnidicPos::Conjunction,
            JMPartOfSpeech::Prefix => UnidicPos::Prefix,
            JMPartOfSpeech::Adnomial => UnidicPos::PrenounAdjectival,
            JMPartOfSpeech::Expression => UnidicPos::Expression,
            JMPartOfSpeech::Unclassified => UnidicPos::Unknown,
            JMPartOfSpeech::Symbol => UnidicPos::Symbol(UnidicSymbolPos2::Unknown),
        }
    }
}

impl From<UnidicPos> for PartOfSpeech {
    fn from(value: UnidicPos) -> Self {
        let pos = match value {
            UnidicPos::Noun(_) => JMPartOfSpeech::Noun,
            UnidicPos::Verb(_) => JMPartOfSpeech::Verb,
            UnidicPos::Adjective(_) => JMPartOfSpeech::Adjective,
            UnidicPos::NaAdjective(_) => JMPartOfSpeech::NaAdjective,
            UnidicPos::Particle(_) => JMPartOfSpeech::Particle,
            UnidicPos::Adverb => JMPartOfSpeech::Adverb,
            UnidicPos::Interjection(_) => JMPartOfSpeech::Interjection,
            UnidicPos::Suffix(_) => JMPartOfSpeech::Suffix,
            UnidicPos::AuxVerb => JMPartOfSpeech::AuxiliaryVerb,
            UnidicPos::Pronoun => JMPartOfSpeech::Pronoun,
            UnidicPos::Conjunction => JMPartOfSpeech::Conjunction,
            UnidicPos::Prefix => JMPartOfSpeech::Prefix,
            UnidicPos::PrenounAdjectival => JMPartOfSpeech::Adnomial,
            UnidicPos::Expression => JMPartOfSpeech::Expression,
            UnidicPos::SupplementarySymbol(_) => JMPartOfSpeech::Symbol,
            UnidicPos::Whitespace => JMPartOfSpeech::Symbol,
            UnidicPos::Symbol(_) => JMPartOfSpeech::Symbol,
            UnidicPos::Unknown => JMPartOfSpeech::Unclassified,
        };
        Self(pos)
    }
}
