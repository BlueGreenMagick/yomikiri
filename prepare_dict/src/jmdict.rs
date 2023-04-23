use serde::{Serialize};

#[derive(Debug, Default, PartialEq, Eq, Serialize)]
pub struct Entry {
    /// 0+ k_ele
    pub forms: Vec<Form>,
    /// 1+ r_ele
    pub readings: Vec<Reading>,
    /// 1+ sense
    pub sense: Vec<Sense>
}

#[derive(Debug, Default, PartialEq, Eq, Serialize)]
pub struct Form {
    pub form: String,
    /// 0+ ke_inf
    pub info: Vec<String>,
    /// 0+ ke_pri
    pub priority: Vec<String>
}

#[derive(Debug, Default, PartialEq, Eq, Serialize)]
pub struct Reading {
    pub reading: String,
    pub nokanji: bool,
    /// 0+ re_restr
    pub to_form: Vec<String>,
    /// 0+ re_inf
    pub info: Vec<String>,
    /// 0+ re_pri
    pub priority: Vec<String>
}

#[derive(Debug, Default, PartialEq, Eq, Serialize)]
pub struct Sense {
    /// 0+ 'stagk'
    pub to_form: Vec<String>,
    /// 0+ 'stagr'
    pub to_reading: Vec<String>,
    /// 'pos'
    pub part_of_speech: Vec<String>,
    /// 'xref'
    pub reference: Vec<String>,
    /// 'ant'
    pub antonym: Vec<String>,
    /// 'field'
    pub field: Vec<String>,
    /// 'misc'
    pub misc: Vec<String>,
    /// 's_inf'
    pub info: Vec<String>,
    /// 'dial'
    pub dialect: Vec<String>,
    /// 'gloss'
    pub meaning: Vec<String>,
    // 'example'
    // example: Vec<Example>,
}