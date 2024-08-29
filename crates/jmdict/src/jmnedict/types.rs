pub struct JMneDict {
    pub entries: Vec<JMneEntry>,
}

/// `<entry>`
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
pub struct JMneKanji {
    pub kanji: String,
    pub info: Vec<String>,
    pub priority: Vec<String>,
}

/// `<r_ele>`
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
pub struct JMneTranslation {
    pub name_type: Vec<String>,
    pub xref: Vec<String>,
    /// English translations are included
    pub translations: Vec<String>,
}
