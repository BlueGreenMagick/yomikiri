use core::str;
use std::collections::HashSet;
use std::hash::Hash;

use log::warn;
use quick_xml::events::Event;
use quick_xml::Reader;

use super::types::{
    JMDialect, JMDict, JMEntry, JMForm, JMKanjiInfo, JMPartOfSpeech, JMReading, JMSense,
    JMSenseMisc,
};
use crate::jmdict::types::JMReadingInfo;
use crate::xml::{parse_in_tag, parse_string_in_tag, parse_text_in_tag, TagName};
use crate::{Error, Result};

/// `parse_entity_enum!(reader, EnumName, "tag", add_to)`
///
/// Parses a field in "tag" using `EnumName::parse_field()`,
/// and if it returns `Some(val)`, run `add_to.push(val)`
macro_rules! parse_entity_enum {
    ($reader:ident, $enum: ident, $tag: literal, $to:expr ) => {
        let field = parse_text_in_tag($reader, $tag.as_bytes())?;
        let value = $enum::parse_field(&field);
        if let Some(value) = value {
            $to.push(value);
        } else {
            warn!("Unknown {}: {}", $tag, String::from_utf8_lossy(&field));
        }
    };
}

pub fn parse_jmdict_xml(xml: &str) -> Result<JMDict> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text_start = true;
    reader.config_mut().trim_text_end = true;
    reader.config_mut().expand_empty_elements = true;

    parse_jmdict(&mut reader)
}

fn parse_jmdict(reader: &mut Reader<&[u8]>) -> Result<JMDict> {
    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"JMdict" => {
                    let entries = parse_in_jmdict(reader)?;
                    return Ok(JMDict { entries });
                }
                _ => {
                    warn!("Unknown global tag: {}", tag.tag_name());
                }
            },
            Event::Eof => return Err(Error::InvalidXml("<JMdict> not found".into())),
            _ => {}
        }
    }
}

fn parse_in_jmdict(reader: &mut Reader<&[u8]>) -> Result<Vec<JMEntry>> {
    let mut entries = Vec::new();

    parse_in_tag(reader, "JMdict", |reader, tag| {
        match tag.name().0 {
            b"entry" => entries.push(parse_in_entry(reader)?),
            _ => {
                warn!("Unknown tag in <jmdict>: <{}>", tag.tag_name());
            }
        };

        Ok(())
    })?;

    Ok(entries)
}
/// Parse within `<entry>` tag. `id` is set to 0 if `<ent_seq>` tag is not found.
pub fn parse_in_entry(reader: &mut Reader<&[u8]>) -> Result<JMEntry> {
    let mut id: Option<u32> = None;
    let mut entry = JMEntry::default();

    parse_in_tag(reader, "entry", |reader, tag| {
        match tag.name().0 {
            b"ent_seq" => {
                if let Some(id) = id {
                    return Err(Error::MultipleEntryIds(id));
                }
                let idstr = parse_string_in_tag(reader, b"ent_seq")?;
                let seq_id = str::parse::<u32>(&idstr)
                    .map_err(|_| format!("Couldn't parse as u32 number: {}", idstr))?;
                id = Some(seq_id);
            }
            b"k_ele" => {
                let form = parse_in_form(reader)?;
                entry.forms.push(form);
            }
            b"r_ele" => {
                let reading = parse_in_reading(reader)?;
                entry.readings.push(reading);
            }
            b"sense" => {
                let sense = parse_in_sense(reader)?;
                entry.senses.push(sense);
            }
            _ => {
                warn!("Unknown tag in <entry>: <{}>", tag.tag_name())
            }
        };
        Ok(())
    })?;

    if let Some(id) = id {
        entry.id = id;
        Ok(entry)
    } else {
        Err(Error::NoEntryId(reader.buffer_position()))
    }
}

pub fn parse_in_form(reader: &mut Reader<&[u8]>) -> Result<JMForm> {
    let mut form = JMForm::default();

    parse_in_tag(reader, "k_ele", |reader, tag| {
        match tag.name().0 {
            b"keb" => {
                if !form.form.is_empty() {
                    warn!("Found multiple <keb> in form '{}' in JMDict", form.form)
                }
                form.form = parse_string_in_tag(reader, b"keb")?;
            }
            b"ke_inf" => {
                parse_entity_enum!(reader, JMKanjiInfo, "ke_inf", form.info);
            }
            b"ke_pri" => {
                form.priority.push(parse_string_in_tag(reader, b"ke_pri")?);
            }
            _ => {
                warn!("Unknown tag in <entry>: {}", tag.tag_name());
            }
        };
        Ok(())
    })?;

    Ok(form)
}

pub fn parse_in_reading(reader: &mut Reader<&[u8]>) -> Result<JMReading> {
    let mut reading = JMReading::default();

    parse_in_tag(reader, "r_ele", |reader, tag| {
        match tag.name().0 {
            b"reb" => {
                reading.reading = parse_string_in_tag(reader, b"reb")?;
            }
            b"re_nokanji" => {
                reading.nokanji = true;
                // consume ending tag
                parse_string_in_tag(reader, b"re_nokanji")?;
            }
            b"re_restr" => {
                reading
                    .to_form
                    .push(parse_string_in_tag(reader, b"re_restr")?);
            }
            b"re_inf" => {
                parse_entity_enum!(reader, JMReadingInfo, "re_inf", reading.info);
            }
            b"re_pri" => {
                reading
                    .priority
                    .push(parse_string_in_tag(reader, b"re_pri")?);
            }
            _ => {
                warn!("Unknown tag in <r_ele>: {}", &tag.tag_name());
            }
        };
        Ok(())
    })?;

    Ok(reading)
}

fn parse_in_sense(reader: &mut Reader<&[u8]>) -> Result<JMSense> {
    let mut sense = JMSense::default();

    parse_in_tag(reader, "sense", |reader, tag| {
        match tag.name().0 {
            b"stagk" => {
                sense.to_form.push(parse_string_in_tag(reader, b"stagk")?);
            }
            b"stagr" => {
                sense
                    .to_reading
                    .push(parse_string_in_tag(reader, b"stagr")?);
            }
            b"pos" => {
                parse_entity_enum!(reader, JMPartOfSpeech, "pos", sense.part_of_speech);
                dedup_vec(&mut sense.part_of_speech);
            }
            b"xref" => {
                parse_string_in_tag(reader, b"xref")?;
            }
            b"ant" => {
                parse_string_in_tag(reader, b"ant")?;
            }
            b"field" => {
                parse_string_in_tag(reader, b"field")?;
            }
            b"misc" => {
                parse_entity_enum!(reader, JMSenseMisc, "misc", sense.misc);
            }
            b"s_inf" => {
                sense.info.push(parse_string_in_tag(reader, b"s_inf")?);
            }
            b"dial" => {
                parse_entity_enum!(reader, JMDialect, "dial", sense.dialect);
            }
            b"gloss" => {
                sense.meaning.push(parse_string_in_tag(reader, b"gloss")?);
            }
            b"lsource" => {
                // consume ending tag
                parse_string_in_tag(reader, b"lsource")?;
            }
            b"example" => {
                parse_string_in_tag(reader, b"example")?;
            }
            _ => {
                warn!("Unknown tag in <sense>: {}", tag.tag_name());
            }
        };
        Ok(())
    })?;

    Ok(sense)
}

fn dedup_vec<T: Eq + Hash + Copy>(vec: &mut Vec<T>) {
    let mut set = HashSet::with_capacity(vec.len());
    vec.retain(|x| set.insert(*x));
}

#[cfg(test)]
mod tests {
    use insta::assert_yaml_snapshot;

    use crate::parse_jmdict_xml;

    #[test]
    fn test_xml_parse() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<!-- some other comment -->
<!-- JMdict created: 2024-08-07 -->
<JMdict>
<entry>
<ent_seq>1000040</ent_seq>
<k_ele>
<keb>〃</keb>
</k_ele>
<r_ele>
<reb>おなじ</reb>
</r_ele>
<r_ele>
<reb>おなじく</reb>
</r_ele>
<sense>
<pos>&n;</pos>
<gloss>ditto mark</gloss>
</sense>
</entry>
<entry>
<ent_seq>1000050</ent_seq>
<k_ele>
<keb>仝</keb>
</k_ele>
<r_ele>
<reb>どうじょう</reb>
</r_ele>
<sense>
<pos>&n;</pos>
<gloss>"as above" mark</gloss>
</sense>
</entry>
</JMdict>
"#;
        let result = parse_jmdict_xml(&xml).unwrap();
        assert_yaml_snapshot!(result);
    }

    #[test]
    fn test_parse_dialect() {
        let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<JMdict>
<entry>
<ent_seq>1234567</ent_seq>
<k_ele>
<keb>言葉</keb>
</k_ele>
<r_ele>
<reb>ことば</reb>
</r_ele>
<sense>
<pos>&n;</pos>
<xref>次発</xref>
<dial>&bra;</dial>
<dial>&hob;</dial>
<dial>&ksb;</dial>
<dial>&ktb;</dial>
<dial>&kyb;</dial>
<dial>&kyu;</dial>
<dial>&nab;</dial>
<dial>&osb;</dial>
<dial>&rkb;</dial>
<dial>&thb;</dial>
<dial>&tsb;</dial>
<dial>&tsug;</dial>
<dial>unk</dial>
<gloss>some meaning</gloss>
</sense>
</entry>
</JMdict>
"#;
        let result = parse_jmdict_xml(&xml).unwrap();
        assert_yaml_snapshot!(result);
    }
}
