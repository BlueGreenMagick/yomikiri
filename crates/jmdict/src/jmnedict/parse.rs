use core::str;

use log::warn;
use quick_xml::events::Event;
use quick_xml::Reader;

use crate::jmnedict::types::JMneNameType;
use crate::utils::parse_entity_enum;
use crate::xml::{parse_in_tag, parse_string_in_tag, TagName};
use crate::{Error, Result};

use super::types::{JMneDict, JMneEntry, JMneKanji, JMneReading, JMneTranslation};

pub fn parse_jmnedict_xml(xml: &str) -> Result<JMneDict> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text_start = true;
    reader.config_mut().trim_text_end = true;
    reader.config_mut().expand_empty_elements = true;

    parse_jmnedict(&mut reader)
}

fn parse_jmnedict(reader: &mut Reader<&[u8]>) -> Result<JMneDict> {
    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"JMnedict" => {
                    let entries = parse_in_jmnedict(reader)?;
                    return Ok(JMneDict { entries });
                }
                _ => {
                    warn!("Unknown global tag: {}", tag.tag_name());
                }
            },
            Event::Eof => return Err(Error::InvalidXml("<JMnedict> not found".into())),
            _ => {}
        }
    }
}

fn parse_in_jmnedict(reader: &mut Reader<&[u8]>) -> Result<Vec<JMneEntry>> {
    let mut entries = Vec::with_capacity(1024);
    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"entry" => {
                    entries.push(parse_in_entry(reader)?);
                }
                _ => {
                    warn!("Unknown tag in <JMnedict>: <{}>", &tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"JMnedict" {
                    return Ok(entries);
                }
            }
            Event::Eof => return Err(Error::InvalidXml("<JMnedict not closed>".into())),
            _ => {}
        }
    }
}

fn parse_in_entry(reader: &mut Reader<&[u8]>) -> Result<JMneEntry> {
    let mut entry = JMneEntry::default();
    let mut id: Option<u32> = None;

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
                entry.kanjis.push(parse_in_kanji(reader)?);
            }
            b"r_ele" => {
                entry.readings.push(parse_in_reading(reader)?);
            }
            b"trans" => {
                entry.translations.push(parse_in_translation(reader)?);
            }
            _ => {
                warn!("Unknown tag in <entry>: <{}>", &tag.tag_name());
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

fn parse_in_kanji(reader: &mut Reader<&[u8]>) -> Result<JMneKanji> {
    let mut kanji: Option<String> = None;
    let mut infos = vec![];
    let mut priorities = vec![];

    parse_in_tag(reader, "k_ele", |reader, tag| {
        match tag.name().0 {
            b"keb" => {
                if let Some(kanji) = kanji.as_ref() {
                    warn!(
                        "Warning: Found multiple <keb> in form '{}' in JMneDict",
                        kanji
                    )
                }
                kanji = Some(parse_string_in_tag(reader, b"keb")?);
            }
            b"ke_inf" => {
                let info = parse_string_in_tag(reader, b"ke_inf")?;
                infos.push(info);
            }
            b"ke_pri" => {
                let priority = parse_string_in_tag(reader, b"ke_pri")?;
                priorities.push(priority);
            }
            _ => {
                warn!("Unknown tag in <k_ele>: {}", tag.tag_name());
            }
        };
        Ok(())
    })?;

    let kanji = kanji.ok_or(Error::InvalidXml("No <keb> found in <k_ele>".into()))?;
    let kanji = JMneKanji {
        kanji,
        info: infos,
        priority: priorities,
    };

    Ok(kanji)
}

fn parse_in_reading(reader: &mut Reader<&[u8]>) -> Result<JMneReading> {
    let mut reading: Option<String> = None;
    let mut to_forms = vec![];
    let mut infos = vec![];
    let mut priorities = vec![];

    parse_in_tag(reader, "r_ele", |reader, tag| {
        match tag.name().0 {
            b"reb" => {
                reading = Some(parse_string_in_tag(reader, b"reb")?);
            }
            b"re_restr" => {
                let to_form = parse_string_in_tag(reader, b"re_restr")?;
                to_forms.push(to_form);
            }
            b"re_inf" => {
                let info = parse_string_in_tag(reader, b"re_inf")?;
                infos.push(info);
            }
            b"re_pri" => {
                let priority = parse_string_in_tag(reader, b"re_pri")?;
                priorities.push(priority);
            }
            _ => {
                warn!("Unknown tag in <r_ele>: {}", &tag.tag_name());
            }
        };
        Ok(())
    })?;

    let reading = reading.ok_or(Error::InvalidXml("No <reb> found in <r_ele>".into()))?;
    let reading = JMneReading {
        reading,
        to_form: to_forms,
        info: infos,
        priority: priorities,
    };

    Ok(reading)
}

fn parse_in_translation(reader: &mut Reader<&[u8]>) -> Result<JMneTranslation> {
    let mut translation = JMneTranslation::default();

    parse_in_tag(reader, "trans", |reader, tag| {
        match tag.name().0 {
            b"name_type" => {
                parse_entity_enum!(reader, JMneNameType, "name_type", translation.name_type);
            }
            b"xref" => {
                translation.xref.push(parse_string_in_tag(reader, b"xref")?);
            }
            b"trans_det" => {
                let tr_text = parse_string_in_tag(reader, b"trans_det")?;
                for attr in tag.attributes() {
                    let attr = attr?;
                    if attr.key.0 == b"xml:lang" {
                        let lang = attr.value;
                        if lang.as_ref() != b"eng" {
                            println!(
                                "<trans_det> has non-english value: {}",
                                str::from_utf8(&lang)?
                            );
                            return Ok(());
                        }
                    }
                }
                translation.translations.push(tr_text);
            }
            _ => {
                warn!("Unknown tag in <trans>: {}", &tag.tag_name());
            }
        };
        Ok(())
    })?;

    Ok(translation)
}
