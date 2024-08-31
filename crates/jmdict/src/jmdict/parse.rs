use core::str;

use quick_xml::events::Event;
use quick_xml::Reader;

use super::types::{JMDict, JMEntry, JMForm, JMReading, JMSense};
use crate::xml::{parse_text_in_tag, TagName};
use crate::Result;

pub fn parse_jmdict_xml(xml: &str) -> Result<JMDict> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text_start = true;
    reader.config_mut().trim_text_end = true;

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
                    println!("Unknown global tag: {}", tag.tag_name());
                }
            },
            _ => {}
        };
    }
}

fn parse_in_jmdict(reader: &mut Reader<&[u8]>) -> Result<Vec<JMEntry>> {
    let mut entries = Vec::new();
    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"entry" => entries.push(parse_in_entry(reader)?),
                _ => {
                    println!("Unknown tag in <jmdict>: <{}>", tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"JMdict" {
                    return Ok(entries);
                }
            }
            _ => {}
        }
    }
}
/// Parse within `<entry>` tag. `id` is set to 0 if `<ent_seq>` tag is not found.
pub fn parse_in_entry(reader: &mut Reader<&[u8]>) -> Result<JMEntry> {
    let mut entry = JMEntry::default();
    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"ent_seq" => {
                    let idstr = parse_text_in_tag(reader, b"ent_seq")?;
                    let id = str::parse::<u32>(&idstr)
                        .map_err(|_| format!("Couldn't parse as u32 number: {}", idstr))?;
                    entry.id = id;
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
                    println!("Unknown tag in <entry>: <{}>", tag.tag_name())
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"entry" {
                    if entry.id == 0 {
                        println!("Found an entry in JMDict without `<ent_seq>`. Its id has been set to 0.")
                    }
                    return Ok(entry);
                }
                // skip other ending tags as it may be from unknown starting tags
            }
            _ => {}
        }
    }
}

pub fn parse_in_form(reader: &mut Reader<&[u8]>) -> Result<JMForm> {
    let mut form = JMForm::default();
    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"keb" => {
                    if !form.form.is_empty() {
                        println!(
                            "Warning: Found multiple <keb> in form '{}' in JMDict",
                            form.form
                        )
                    }
                    form.form = parse_text_in_tag(reader, b"keb")?;
                }
                b"ke_inf" => {
                    form.info.push(parse_text_in_tag(reader, b"ke_inf")?);
                }
                b"ke_pri" => {
                    form.priority.push(parse_text_in_tag(reader, b"ke_pri")?);
                }
                _ => {
                    println!("Warning: Unknown tag in <entry>: {}", tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"k_ele" {
                    return Ok(form);
                }
            }
            _ => {}
        }
    }
}

pub fn parse_in_reading(reader: &mut Reader<&[u8]>) -> Result<JMReading> {
    let mut reading = JMReading::default();
    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"reb" => {
                    reading.reading = parse_text_in_tag(reader, b"reb")?;
                }
                b"re_nokanji" => {
                    reading.nokanji = true;
                    // consume ending tag
                    parse_text_in_tag(reader, b"re_nokanji")?;
                }
                b"re_restr" => {
                    reading
                        .to_form
                        .push(parse_text_in_tag(reader, b"re_restr")?);
                }
                b"re_inf" => {
                    reading.info.push(parse_text_in_tag(reader, b"re_inf")?);
                }
                b"re_pri" => {
                    reading.priority.push(parse_text_in_tag(reader, b"re_pri")?);
                }
                _ => {
                    println!("Unknown tag in <r_ele>: {}", &tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"r_ele" {
                    return Ok(reading);
                }
            }
            _ => {}
        }
    }
}

fn parse_in_sense(reader: &mut Reader<&[u8]>) -> Result<JMSense> {
    let mut sense = JMSense::default();
    loop {
        match reader.read_event()? {
            Event::Start(tag) => match tag.name().0 {
                b"stagk" => {
                    sense.to_form.push(parse_text_in_tag(reader, b"stagk")?);
                }
                b"stagr" => {
                    sense.to_reading.push(parse_text_in_tag(reader, b"stagr")?);
                }
                b"pos" => {
                    sense
                        .part_of_speech
                        .push(parse_text_in_tag(reader, b"pos")?);
                }
                b"xref" => {
                    parse_text_in_tag(reader, b"xref")?;
                }
                b"ant" => {
                    parse_text_in_tag(reader, b"ant")?;
                }
                b"field" => {
                    parse_text_in_tag(reader, b"field")?;
                }
                b"misc" => {
                    sense.misc.push(parse_text_in_tag(reader, b"misc")?);
                }
                b"s_inf" => {
                    sense.info.push(parse_text_in_tag(reader, b"s_inf")?);
                }
                b"dial" => {
                    sense.dialect.push(parse_text_in_tag(reader, b"dial")?);
                }
                b"gloss" => {
                    sense.meaning.push(parse_text_in_tag(reader, b"gloss")?);
                }
                b"lsource" => {
                    // consume ending tag
                    parse_text_in_tag(reader, b"lsource")?;
                }
                b"example" => {
                    parse_text_in_tag(reader, b"example")?;
                }
                _ => {
                    println!("Unknown tag in <sense>: {}", tag.tag_name());
                }
            },
            Event::End(tag) => {
                if tag.name().0 == b"sense" {
                    return Ok(sense);
                }
            }
            _ => {}
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::jmdict::JMDict;
    use crate::parse_jmdict_xml;

    use super::{JMEntry, JMForm, JMReading, JMSense};

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

        assert_eq!(
            result,
            JMDict {
                entries: vec![
                    JMEntry {
                        id: 1000040,
                        forms: vec![JMForm {
                            form: "〃".to_string(),
                            ..JMForm::default()
                        }],
                        readings: vec![
                            JMReading {
                                reading: "おなじ".to_string(),
                                ..JMReading::default()
                            },
                            JMReading {
                                reading: "おなじく".to_string(),
                                ..JMReading::default()
                            }
                        ],
                        senses: vec![JMSense {
                            part_of_speech: vec!["=n=".to_string()],
                            meaning: vec!["ditto mark".to_string()],
                            ..JMSense::default()
                        }]
                    },
                    JMEntry {
                        id: 1000050,
                        forms: vec![JMForm {
                            form: "仝".to_string(),
                            ..JMForm::default()
                        }],
                        readings: vec![JMReading {
                            reading: "どうじょう".to_string(),
                            ..JMReading::default()
                        }],
                        senses: vec![JMSense {
                            part_of_speech: vec!["=n=".to_string()],
                            meaning: vec![r#""as above" mark"#.to_string()],
                            ..JMSense::default()
                        }]
                    }
                ]
            }
        );
    }
}
