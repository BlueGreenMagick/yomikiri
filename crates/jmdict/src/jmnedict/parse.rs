use core::str;

use quick_xml::events::Event;
use quick_xml::Reader;

use crate::xml::{parse_text_in_tag, TagName};
use crate::{Error, Result};

use super::types::{JMneDict, JMneEntry, JMneKanji, JMneReading, JMneTranslation};

pub fn parse_jmnedict_xml(xml: &str) -> Result<JMneDict> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text_start = true;
    reader.config_mut().trim_text_end = true;

    parse_jmnedict(&mut reader)
}

fn parse_jmnedict(reader: &mut Reader<&[u8]>) -> Result<JMneDict> {
    loop {
        if let Event::Start(tag) = reader.read_event()? {
            match tag.name().0 {
                b"JMnedict" => {
                    let entries = parse_in_jmnedict(reader)?;
                    return Ok(JMneDict { entries });
                }
                _ => {
                    println!("Unknown global tag: {}", tag.tag_name());
                }
            }
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
                    println!("Unknown tag in <JMnedict>: <{}>", &tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"JMnedict" {
                    return Ok(entries);
                }
            }
            _ => {}
        }
    }
}

fn parse_in_entry(reader: &mut Reader<&[u8]>) -> Result<JMneEntry> {
    let mut entry = JMneEntry::default();
    let mut id: Option<u32> = None;

    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"ent_seq" => {
                    if let Some(id) = id {
                        return Err(Error::MultipleEntryIds(id));
                    }
                    let idstr = parse_text_in_tag(reader, b"ent_seq")?;
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
                    println!("Unknown tag in <entry>: <{}>", &tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"entry" {
                    if let Some(id) = id {
                        entry.id = id;
                        return Ok(entry);
                    } else {
                        return Err(Error::NoEntryId(reader.buffer_position()));
                    }
                }
            }
            _ => {}
        }
    }
}

fn parse_in_kanji(reader: &mut Reader<&[u8]>) -> Result<JMneKanji> {
    let mut kanji: Option<String> = None;
    let mut infos = vec![];
    let mut priorities = vec![];

    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"keb" => {
                    if let Some(kanji) = kanji {
                        println!(
                            "Warning: Found multiple <keb> in form '{}' in JMneDict",
                            kanji
                        )
                    }
                    kanji = Some(parse_text_in_tag(reader, b"keb")?);
                }
                b"ke_inf" => {
                    let info = parse_text_in_tag(reader, b"ke_inf")?;
                    infos.push(info);
                }
                b"ke_pri" => {
                    let priority = parse_text_in_tag(reader, b"ke_pri")?;
                    priorities.push(priority);
                }
                _ => {
                    println!("Unknown tag in <k_ele>: {}", tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"k_ele" {
                    let kanji =
                        kanji.ok_or(Error::InvalidXml("No <keb> found in <k_ele>".into()))?;
                    let kanji = JMneKanji {
                        kanji,
                        info: infos,
                        priority: priorities,
                    };
                    return Ok(kanji);
                }
            }
            _ => {}
        }
    }
}

fn parse_in_reading(reader: &mut Reader<&[u8]>) -> Result<JMneReading> {
    let mut reading: Option<String> = None;
    let mut to_forms = vec![];
    let mut infos = vec![];
    let mut priorities = vec![];

    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"reb" => {
                    reading = Some(parse_text_in_tag(reader, b"reb")?);
                }
                b"re_restr" => {
                    let to_form = parse_text_in_tag(reader, b"re_restr")?;
                    to_forms.push(to_form);
                }
                b"re_inf" => {
                    let info = parse_text_in_tag(reader, b"re_inf")?;
                    infos.push(info);
                }
                b"re_pri" => {
                    let priority = parse_text_in_tag(reader, b"re_pri")?;
                    priorities.push(priority);
                }
                _ => {
                    println!("Unknown tag in <r_ele>: {}", &tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"r_ele" {
                    let reading =
                        reading.ok_or(Error::InvalidXml("No <reb> found in <r_ele>".into()))?;
                    let reading = JMneReading {
                        reading,
                        to_form: to_forms,
                        info: infos,
                        priority: priorities,
                    };
                    return Ok(reading);
                }
            }
            _ => {}
        }
    }
}

fn parse_in_translation(reader: &mut Reader<&[u8]>) -> Result<JMneTranslation> {
    let mut translation = JMneTranslation::default();

    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"name_type" => {
                    translation
                        .name_type
                        .push(parse_text_in_tag(reader, b"name_type")?);
                }
                b"xref" => {
                    translation.xref.push(parse_text_in_tag(reader, b"xref")?);
                }
                b"trans_det" => {
                    for attr in tag.attributes() {
                        let attr = attr?;
                        if attr.key.0 == b"xml:lang" {
                            let lang = attr.value;
                            if lang.as_ref() != b"eng" {
                                println!(
                                    "<trans_det> has non-english value: {}",
                                    str::from_utf8(&lang)?
                                );
                            } else {
                                translation
                                    .translations
                                    .push(parse_text_in_tag(reader, b"trans_det")?);
                            }
                        }
                    }
                }
                _ => {
                    println!("Unknown tag in <trans>: {}", &tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"trans" {
                    return Ok(translation);
                }
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use insta::assert_yaml_snapshot;

    use crate::Result;

    use super::parse_jmnedict_xml;

    #[test]
    fn test_parse_jmnedict() -> Result<()> {
        let xml = r#"<?xml version="1.0"?>
<!DOCTYPE JMnedict [
        <!ELEMENT JMnedict (entry*)>
<!ENTITY char "character">
<!ENTITY company "company name">
]>
<!-- JMnedict created: 2024-08-29 -->
<JMnedict>
<entry>
<ent_seq>5000000</ent_seq>
<k_ele>
<keb>ゝ泉</keb>
</k_ele>
<r_ele>
<reb>ちゅせん</reb>
</r_ele>
<trans>
<name_type>&given;</name_type>
<trans_det>Chusen</trans_det>
</trans>
</entry>
<entry>
<ent_seq>5000001</ent_seq>
<k_ele>
<keb>〆</keb>
</k_ele>
<r_ele>
<reb>しめ</reb>
</r_ele>
<trans>
<name_type>&fem;</name_type>
<trans_det>Shime</trans_det>
</trans>
</entry>
<entry>
<ent_seq>5616955</ent_seq>
<k_ele>
<keb>富岳</keb>
</k_ele>
<r_ele>
<reb>ふがく</reb>
</r_ele>
<trans>
<name_type>&given;</name_type>
<trans_det>Fugaku</trans_det>
</trans>
<trans>
<name_type>&place;</name_type>
<trans_det>Mount Fuji (alternative name)</trans_det>
</trans>
<trans>
<name_type>&obj;</name_type>
<trans_det>Fugaku (supercomputer)</trans_det>
</trans>
</entry>
</JMnedict>"#;
        println!("ABC");
        let result = parse_jmnedict_xml(&xml)?;
        println!("Done");
        assert_yaml_snapshot!(result);
        Ok(())
    }
}