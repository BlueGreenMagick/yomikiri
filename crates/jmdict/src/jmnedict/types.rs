use serde::{Deserialize, Serialize};

use crate::utils::jm_entity_enum;

#[derive(Debug, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct JMneDict {
    pub entries: Vec<JMneEntry>,
}

/// `<entry>`
#[derive(Debug, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct JMneEntry {
    pub id: u32,
    /// 0+ k_ele
    pub kanjis: Vec<JMneKanji>,
    /// 1+ r_ele
    pub readings: Vec<JMneReading>,
    /// 1+ trans
    pub translations: Vec<JMneTranslation>,
}

/// `<k_ele>`
#[derive(Debug, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct JMneKanji {
    pub kanji: String,
    // Defined, but no entry actually uses the field.
    // pub info: Vec<String>,
    pub priority: Vec<String>,
}

/// `<r_ele>`
#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMneReading {
    pub reading: String,
    pub to_form: Vec<String>,
    pub info: Vec<String>,
    pub priority: Vec<String>,
}

/// `<trans>`
///
/// At the date of development,
/// while specs allows translations in languages other than English,
/// no such translations actually exists in xml.
/// If non-English translations are added in the future,
/// they will be ignored and not be added to `translations` field.
#[derive(Debug, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct JMneTranslation {
    pub name_type: Vec<JMneNameType>,
    pub xref: Vec<String>,
    /// English translations are included
    pub translations: Vec<String>,
}

jm_entity_enum!(
    JMneNameType;
    #[doc="character"]
    b"char" => Character,
    #[doc="company name"]
    b"company" => Company,
    #[doc="creature"]
    b"creat" => Creature,
    #[doc="deity"]
    b"dei" => Deity,
    #[doc="document"]
    b"doc" => Document,
    #[doc="event"]
    b"ev" => Event,
    #[doc="female given name or forename"]
    b"fem" => Female,
    #[doc="fiction"]
    b"fict" => Fiction,
    #[doc="given name or forename, gender not specified"]
    b"given" => Forename,
    #[doc="group"]
    b"group" => Group,
    #[doc="legend"]
    b"leg" => Legend,
    #[doc="male given name or forename"]
    b"masc" => Male,
    #[doc="mythology"]
    b"myth" => Mythology,
    #[doc="object"]
    b"obj" => Object,
    #[doc="organization name"]
    b"organization" => Organization,
    #[doc="other"]
    b"oth" => Other,
    #[doc="full name of a particular person"]
    b"person" => FullName,
    #[doc="place name"]
    b"place" => Place,
    #[doc="product name"]
    b"product" => Product,
    #[doc="religion"]
    b"relig" => Religion,
    #[doc="service"]
    b"serv" => Service,
    #[doc="ship name"]
    b"ship" => Ship,
    #[doc="railway station"]
    b"station" => Railway,
    #[doc="family or surname"]
    b"surname" => FamilyName,
    #[doc="unclassified name"]
    b"unclass" => Unclassified,
    #[doc="work of art, literature, music, etc. name"]
    b"work" => Work,
);
