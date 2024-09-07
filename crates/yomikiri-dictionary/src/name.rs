use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use tsify_next::{declare, Tsify};
use yomikiri_jmdict::jmnedict::JMneNameType;

// Alternatively, use below kind of struct?
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NameEntry {
    pub kanji: String,
    pub groups: Vec<GroupedNameItem>,
}
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GroupedNameItem {
    pub types: Vec<NameType>,
    pub items: Vec<NameItem>,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NameItem {
    pub id: u32,
    pub reading: String,
}

#[cfg_attr(feature = "wasm", declare)]
pub type NameType = JMneNameType;
