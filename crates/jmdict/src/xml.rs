use regex::Regex;
use rustyxml::{Event, Parser};

use std::borrow::Cow;

use crate::jmdict::{JMDict, JMEntry, JMForm, JMReading, JMSense};
use crate::{Error, Result};

/// RustyXML errors upon custom entity `&xx;`
/// So unescape to `=xx=` before parsing
pub fn unescape_entity(xml: &str) -> Cow<'_, str> {
    let re = Regex::new(r#"&([\w\d-]+);"#).unwrap();
    re.replace_all(xml, "=$1=")
}

/// RustyXML cannot parse DOCTYPE declarations
pub fn remove_doctype(xml: &str) -> String {
    let re = Regex::new(r#"<!DOCTYPE \w+ \[[^\]]+\]>"#).unwrap();
    re.replace(xml, "").into_owned()
}

pub fn parse_xml(xml_string: &str) -> Result<JMDict> {
    let mut parser = Parser::new();
    parser.feed_str(xml_string);

    let creation_date_regex = Regex::new(r#"^JMdict created: *([\w\W]+)$"#).unwrap();
    let mut creation_date: Option<String> = None;

    loop {
        match parser.next().ok_or("<JMDict> not found")?? {
            Event::ElementStart(tag) => {
                if &tag.name == "JMdict" {
                    let entries = parse_jmdict(&mut parser)?;
                    return Ok(JMDict {
                        entries,
                        creation_date,
                    });
                }
            }
            Event::Comment(comment) => {
                if !creation_date.is_some() {
                    let trimmed = comment.trim();
                    // JMdict creation comment comes before <jmdict> tag
                    if let Some(capture) = creation_date_regex.captures(trimmed) {
                        creation_date = Some(capture.get(1).unwrap().as_str().to_string());
                    }
                }
            }
            _ => {}
        }
    }
}

pub fn parse_jmdict(parser: &mut Parser) -> Result<Vec<JMEntry>> {
    let mut entries = Vec::new();
    loop {
        match parser.next().ok_or("<entry> unclosed")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "entry" => {
                    entries.push(parse_entry(parser)?);
                }
                _ => {
                    println!("Unknown tag in <entry>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "JMdict" {
                    return Ok(entries);
                }
            }
            _ => {}
        }
    }
}

pub fn parse_entry(parser: &mut Parser) -> Result<JMEntry> {
    let mut entry = JMEntry::default();
    loop {
        match parser.next().ok_or("<entry> unclosed")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "ent_seq" => {}
                "k_ele" => {
                    let form = parse_form(parser)?;
                    entry.forms.push(form);
                }
                "r_ele" => {
                    let reading = parse_reading(parser)?;
                    entry.readings.push(reading);
                }
                "sense" => {
                    let sense = parse_sense(parser)?;
                    entry.senses.push(sense);
                }
                _ => {
                    println!("Unknown tag in <entry>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "entry" {
                    return Ok(entry);
                }
            }
            _ => {}
        }
    }
}

pub fn parse_form(parser: &mut Parser) -> Result<JMForm> {
    let mut form = JMForm::default();
    loop {
        match parser.next().ok_or("<k_ele> unclosed")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "keb" => {
                    form.form = parse_characters(parser, "keb")?;
                }
                "ke_inf" => {
                    form.info.push(parse_characters(parser, "ke_inf")?);
                }
                "ke_pri" => {
                    form.priority.push(parse_characters(parser, "ke_pri")?);
                }
                _ => {
                    println!("Unknown tag in <entry>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "k_ele" {
                    return Ok(form);
                } else {
                    return Err(format!("Expected </k_ele>, found {}", &tag.name).into());
                }
            }
            _ => {}
        }
    }
}

pub fn parse_reading(parser: &mut Parser) -> Result<JMReading> {
    let mut reading = JMReading::default();
    loop {
        match parser.next().ok_or("<r_ele> unclosed")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "reb" => {
                    reading.reading = parse_characters(parser, "reb")?;
                }
                "re_nokanji" => {
                    reading.nokanji = true;
                    // consume ending tag
                    parse_characters(parser, "re_nokanji")?;
                }
                "re_restr" => {
                    reading.to_form.push(parse_characters(parser, "re_restr")?);
                }
                "re_inf" => {
                    reading.info.push(parse_characters(parser, "re_inf")?);
                }
                "re_pri" => {
                    reading.priority.push(parse_characters(parser, "re_pri")?);
                }
                _ => {
                    println!("Unknown tag in <entry>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "r_ele" {
                    return Ok(reading);
                } else {
                    return Err(Error::Unexpected {
                        expected: "</r_ele>",
                        actual: tag.name.to_string(),
                    });
                }
            }
            _ => {}
        }
    }
}

fn parse_sense(parser: &mut Parser) -> Result<JMSense> {
    let mut sense = JMSense::default();
    loop {
        match parser.next().ok_or("<sense> unclosed")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "stagk" => {
                    sense.to_form.push(parse_characters(parser, "stagk")?);
                }
                "stagr" => {
                    sense.to_reading.push(parse_characters(parser, "stagr")?);
                }
                "pos" => {
                    sense.part_of_speech.push(parse_characters(parser, "pos")?);
                }
                "xref" => {
                    parse_characters(parser, "xref")?;
                }
                "ant" => {
                    parse_characters(parser, "ant")?;
                }
                "field" => {
                    parse_characters(parser, "field")?;
                }
                "misc" => {
                    sense.misc.push(parse_characters(parser, "misc")?);
                }
                "s_inf" => {
                    sense.info.push(parse_characters(parser, "s_inf")?);
                }
                "dial" => {
                    sense.dialect.push(parse_characters(parser, "dial")?);
                }
                "gloss" => {
                    sense.meaning.push(parse_characters(parser, "gloss")?);
                }
                "lsource" => {
                    // consume ending tag
                    parse_characters(parser, "lsource")?;
                }
                "example" => {
                    parse_characters(parser, "example")?;
                }
                _ => {
                    println!("Unknown tag in <entry>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "sense" {
                    return Ok(sense);
                } else {
                    return Err(Error::Unexpected {
                        expected: "</sense>",
                        actual: tag.name.to_string(),
                    });
                }
            }
            _ => {}
        }
    }
}

pub fn parse_characters(parser: &mut Parser, in_tag: &str) -> Result<String> {
    let mut characters = String::new();
    for event in parser {
        match event? {
            Event::ElementStart(tag) => {
                return Err(Error::Unexpected {
                    expected: "character",
                    actual: format!("starting tag <{}>", &tag.name),
                });
            }
            Event::ElementEnd(tag) => {
                if tag.name == in_tag {
                    return Ok(characters);
                } else {
                    return Err(Error::Unexpected {
                        expected: "character",
                        actual: format!("ending tag </{}>", &tag.name),
                    });
                }
            }
            Event::Characters(chars) => {
                characters.push_str(chars.as_str());
            }
            _ => {}
        }
    }
    Err(format!("Closing tag not found </{}>", in_tag).into())
}

#[cfg(test)]
mod tests {
    use crate::jmdict::JMDict;

    use super::{parse_xml, unescape_entity, JMEntry, JMForm, JMReading, JMSense};

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
        let xml = unescape_entity(xml);
        let result = parse_xml(&xml).unwrap();

        assert_eq!(
            result,
            JMDict {
                creation_date: Some("2024-08-07".into()),
                entries: vec![
                    JMEntry {
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
