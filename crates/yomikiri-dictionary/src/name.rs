use serde::{Deserialize, Serialize};

#[cfg(feature = "wasm")]
use tsify_next::Tsify;

// Alternatively, use below kind of struct?
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct NameEntry {
    pub kind: NameEntryKind,
    pub surface: String,
    pub groups: Vec<GroupedNameItem>,
}

#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum NameEntryKind {
    /// Name entries whose translation holds meaning,
    /// and not just its reading.
    ///
    /// Currently, all name entries that is not common first names and last names
    /// are under this category
    Meaningful,
    /// Common first names and last names, containing Kanji
    Kanji,
    /// Common first names and last names that is written in kana only.
    Kana,
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
    /// Stores reading in Kind::Kanji, and translations in Kind::Meaningful and Kind::Kana
    pub value: String,
}

// When converting from JMneNameType, ignore all entries whose name type *contains* a type that is not in here.
// So for example, if an entry has both `Female` and `Fullname`, skip that entry.
#[cfg_attr(feature = "wasm", derive(Tsify))]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NameType {
    Forename,
    Surname,
    /// Female forename
    Female,
    /// Male forename
    Male,
}
