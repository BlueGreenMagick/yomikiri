use serde::{Deserialize, Serialize};

#[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMDict {
    pub entries: Vec<JMEntry>,
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMEntry {
    pub id: u32,
    /// 0+ k_ele
    pub forms: Vec<JMForm>,
    /// 1+ r_ele
    pub readings: Vec<JMReading>,
    /// 1+ sense
    pub senses: Vec<JMSense>,
}

impl JMEntry {
    pub fn priority(&self) -> u16 {
        let priorities = &self.readings.first().unwrap().priority;
        let mut priority: u16 = 0;

        for p in priorities {
            // common ~20k entries
            if ["news1", "ichi1", "spec1", "gai1"].contains(&p.as_str()) {
                if priority < 100 {
                    priority += 100
                } else {
                    priority += 25
                }
            // common ~30k entries
            } else if ["news2", "ichi2", "spec2", "gai2"].contains(&p.as_str()) {
                priority += 5
            // 01 ~ 48, each with ~500 entries
            } else if let Some(stripped) = p.strip_prefix("nf") {
                let freq = stripped
                    .parse::<u16>()
                    .expect("could not parse XX as number where priority nfXX");
                priority += 50 - freq;
            }
        }
        priority
    }
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMForm {
    pub form: String,
    /// 0+ ke_inf
    pub info: Vec<JMKanjiInfo>,
    /// 0+ ke_pri
    pub priority: Vec<String>,
}

impl JMForm {
    pub fn is_uncommon(&self) -> bool {
        self.info.iter().any(|s| {
            *s == JMKanjiInfo::OutdatedKanji
                || *s == JMKanjiInfo::RareKanjiForm
                || *s == JMKanjiInfo::SearchOnlyKanji
        })
    }
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMReading {
    pub reading: String,
    pub nokanji: bool,
    /// 0+ re_restr
    pub to_form: Vec<String>,
    /// 0+ re_inf
    pub info: Vec<String>,
    /// 0+ re_pri
    pub priority: Vec<String>,
}

impl JMReading {
    pub fn is_uncommon(&self) -> bool {
        for f in ["=ok=", "=sk="] {
            if self.info.iter().any(|s| s == f) {
                return true;
            }
        }
        false
    }
}

#[derive(Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct JMSense {
    /// 0+ 'stagk'
    pub to_form: Vec<String>,
    /// 0+ 'stagr'
    pub to_reading: Vec<String>,
    /// 'pos'
    pub part_of_speech: Vec<String>,
    /// 'xref'
    // pub reference: Vec<String>,
    /// 'ant'
    // pub antonym: Vec<String>,
    /// 'field'
    // pub field: Vec<String>,
    /// 'misc'
    pub misc: Vec<String>,
    /// 's_inf'
    pub info: Vec<String>,
    /// 'dial'
    pub dialect: Vec<JMDialect>,
    /// 'gloss'
    pub meaning: Vec<String>,
    // 'example'
    // example: Vec<Example>,
}

/*
To easily create jm entity enums,
run below code on xml entity declarations.

```js
function macroCode(decl) {
    let output = ""
    for (const m of decls.matchAll(/<!ENTITY (\w+) "([^"]*)">/g)) {
        output += 'b"'
        output += m[1]
        output += '" '
        output += m[2]
        output += ",\n"
    }
    return output
}

let decls = `<Paste entity declarations in xml>`
console.log(macroCode(decls))
```
*/

macro_rules! jm_entity_enum {
    (
        $enum_name:ident;
        $($key:literal $variant:ident),+,
    ) => {
        #[derive(Debug, PartialEq, Eq, Serialize, Deserialize)]
        pub enum $enum_name {
            $(
                $variant,
            )+
        }

        impl $enum_name {
            pub fn parse_field(field: &[u8]) -> Option<$enum_name> {
                if is_single_entity(field) {
                    match &field[1..field.len() -1] {
                        $(
                            $key => Some(Self::$variant),
                        )+
                        _ => None,
                    }
                } else {
                    None
                }

            }
        }
    };
}

/// returns true if
fn is_single_entity(text: &[u8]) -> bool {
    if text.len() > 2 && text[0] == b'&' && text[text.len() - 1] == b';' {
        let inner = &text[1..text.len() - 1];
        if !inner.contains(&b';') {
            return true;
        }
    }
    return false;
}

jm_entity_enum!(
    JMDialect;
    b"bra" Brazilian,
    b"hob" HokkaidoBen,
    b"ksb" KansaiBen,
    b"ktb" KantouBen,
    b"kyb" KyotoBen,
    b"kyu" KyuushuuBen,
    b"nab" NaganoBen,
    b"osb" OsakaBen,
    b"rkb" RyuukyuuBen,
    b"thb" TouhokuBen,
    b"tsb" TosaBen,
    b"tsug" TsugaruBen,
);

jm_entity_enum!(
    JMKanjiInfo;
    b"bateji" AtejiReading,
    b"bik" IrregularKana,
    b"biK" IrregularKanji,
    b"bio" IrregularOkurigana,
    b"boK" OutdatedKanji,
    b"brK" RareKanjiForm,
    b"bsK" SearchOnlyKanji,
);
