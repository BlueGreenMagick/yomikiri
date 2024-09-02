//! Contains dictionary entry struct
//!
//! `Serialize`, `Deserialize`, `Tsify` is used when passing to web
//! `Decode`, `Encode` is used to encode the structs into the dictionary file

use serde::{Deserialize, Serialize};
use yomikiri_jmdict::jmdict::{JMDialect, JMPartOfSpeech, JMSenseMisc};
use yomikiri_unidic_types::{
    UnidicAdjectivePos2, UnidicInterjectionPos2, UnidicNaAdjectivePos2, UnidicNounPos2,
    UnidicParticlePos2, UnidicPos, UnidicSuffixPos2, UnidicSymbolPos2, UnidicVerbPos2,
};

#[cfg(feature = "wasm")]
use tsify_next::Tsify;

/// An entry should have one kanji or reading
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

/// Ordered by rarity.
/// `Normal` is the most common and `Search`` is the rarest.
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Rarity {
    Normal,
    Rare,
    Outdated,
    Incorrect,
    Search,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GroupedSense {
    pub part_of_speech: Vec<PartOfSpeech>,
    pub senses: Vec<Sense>,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sense {
    pub meanings: Vec<String>,
    // to_kanji or to_reading
    pub constrain: Vec<String>,
    pub misc: Vec<JMSenseMisc>,
    pub info: Vec<String>,
    pub dialects: Vec<JMDialect>,
}

pub type PartOfSpeech = JMPartOfSpeech;

fn jmpos_to_unidic(pos: &JMPartOfSpeech) -> UnidicPos {
    match pos {
        JMPartOfSpeech::Noun => UnidicPos::Noun(UnidicNounPos2::Unknown),
        JMPartOfSpeech::Verb => UnidicPos::Verb(UnidicVerbPos2::Unknown),
        JMPartOfSpeech::Adjective => UnidicPos::Adjective(UnidicAdjectivePos2::Unknown),
        JMPartOfSpeech::NaAdjective => UnidicPos::NaAdjective(UnidicNaAdjectivePos2::Unknown),
        JMPartOfSpeech::Particle => UnidicPos::Particle(UnidicParticlePos2::Unknown),
        JMPartOfSpeech::Adverb => UnidicPos::Adverb,
        JMPartOfSpeech::Interjection => UnidicPos::Interjection(UnidicInterjectionPos2::Unknown),
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

fn unidic_to_jmpos(unidic: &UnidicPos) -> JMPartOfSpeech {
    match unidic {
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
    }
}

impl Entry {
    pub fn main_form(&self) -> Option<&str> {
        if let Some(kanji) = self.kanjis.first() {
            if kanji.rarity == Rarity::Normal {
                return Some(&kanji.kanji);
            }
        }
        if let Some(reading) = self.readings.first() {
            if reading.rarity == Rarity::Normal {
                return Some(&reading.reading);
            }
        }
        if let Some(kanji) = self.kanjis.first() {
            return Some(&kanji.kanji);
        }
        if let Some(reading) = self.readings.first() {
            return Some(&reading.reading);
        }

        None
    }

    pub fn has_pos(&self, pos: PartOfSpeech) -> bool {
        self.grouped_senses
            .iter()
            .any(|g| g.part_of_speech.contains(&pos))
    }
}
