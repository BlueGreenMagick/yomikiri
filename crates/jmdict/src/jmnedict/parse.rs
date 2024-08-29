use rustyxml::{Event, Parser};

use crate::xml::{parse_characters, remove_doctype, unescape_entity};
use crate::{Error, Result};

use super::types::{JMneDict, JMneEntry, JMneKanji, JMneReading, JMneTranslation};

pub fn parse_jmnedict_xml(xml: &str) -> Result<JMneDict> {
    let xml = remove_doctype(xml);
    let xml = unescape_entity(&xml);
    let jmdict = parse_xml(&xml)?;
    Ok(jmdict)
}

fn parse_xml(xml_string: &str) -> Result<JMneDict> {
    let mut parser = Parser::new();
    parser.feed_str(xml_string);

    loop {
        if let Event::ElementStart(tag) = parser.next().ok_or("Tag <JMnedict> not found")?? {
            if &tag.name == "JMnedict" {
                let entries = parse_jmnedict(&mut parser)?;
                return Ok(JMneDict { entries });
            }
        }
    }
}

fn parse_jmnedict(parser: &mut Parser) -> Result<Vec<JMneEntry>> {
    let mut entries = Vec::with_capacity(1024);
    loop {
        match parser.next().ok_or("Closing tag </JMnedict> not found")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "entry" => {
                    entries.push(parse_entry(parser)?);
                }
                _ => {
                    println!("Unknown tag in <JMnedict>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "JMnedict" {
                    return Ok(entries);
                }
            }
            _ => {}
        }
    }
}

fn parse_entry(parser: &mut Parser) -> Result<JMneEntry> {
    let mut id: Option<u32> = None;
    let mut kanjis = vec![];
    let mut readings = vec![];
    let mut translations = vec![];

    loop {
        match parser.next().ok_or("Closing tag </entry> not found")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "k_ele" => {
                    kanjis.push(parse_kanji(parser)?);
                }
                "r_ele" => {
                    readings.push(parse_reading(parser)?);
                }
                "trans" => {
                    translations.push(parse_translation(parser)?);
                }
                "ent_seq" => {
                    let idstr = parse_characters(parser, "ent_seq")?;
                    let idval = str::parse::<u32>(&idstr)
                        .map_err(|_| format!("Couldn't parser as u32 number: {}", idstr))?;
                    id = Some(idval);
                }
                _ => {
                    println!("Unknown tag in <trans>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "entry" {
                    let id = id.ok_or(Error::InvalidXml("Entry without id".into()))?;

                    let entry = JMneEntry {
                        id,
                        kanjis,
                        readings,
                        translations,
                    };
                    return Ok(entry);
                }
            }
            _ => {}
        }
    }
}

fn parse_kanji(parser: &mut Parser) -> Result<JMneKanji> {
    let mut kanji: Option<String> = None;
    let mut infos = vec![];
    let mut priorities = vec![];

    loop {
        match parser.next().ok_or("Closing tag </kanji> not found")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "keb" => {
                    kanji = Some(parse_characters(parser, "keb")?);
                }
                "ke_inf" => {
                    let info = parse_characters(parser, "ke_inf")?;
                    infos.push(info);
                }
                "ke_pri" => {
                    let priority = parse_characters(parser, "ke_pri")?;
                    priorities.push(priority);
                }
                _ => {
                    println!("Unknown tag in <kanji>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "kanji" {
                    let kanji = kanji.ok_or(Error::InvalidXml("No <keb> found in kanji".into()))?;
                    let kanji = JMneKanji {
                        kanji,
                        info: infos,
                        priority: priorities,
                    };
                    return Ok(kanji);
                } else {
                    return Err(Error::Unexpected {
                        expected: "</kanji>",
                        actual: format!("</{}>", tag.name),
                    });
                }
            }
            _ => {}
        }
    }
}

fn parse_reading(parser: &mut Parser) -> Result<JMneReading> {
    let mut reading: Option<String> = None;
    let mut to_forms = vec![];
    let mut infos = vec![];
    let mut priorities = vec![];

    loop {
        match parser.next().ok_or("Closing tag </reading> not found")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "reb" => {
                    reading = Some(parse_characters(parser, "reb")?);
                }
                "re_restr" => {
                    let to_form = parse_characters(parser, "re_restr")?;
                    to_forms.push(to_form);
                }
                "re_inf" => {
                    let info = parse_characters(parser, "re_inf")?;
                    infos.push(info);
                }
                "re_pri" => {
                    let priority = parse_characters(parser, "re_pri")?;
                    priorities.push(priority);
                }
                _ => {
                    println!("Unknown tag in <reading>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "reading" {
                    let reading =
                        reading.ok_or(Error::InvalidXml("No <reb> found in reading".into()))?;
                    let reading = JMneReading {
                        reading,
                        to_form: to_forms,
                        info: infos,
                        priority: priorities,
                    };
                    return Ok(reading);
                } else {
                    return Err(Error::Unexpected {
                        expected: "</reading>",
                        actual: format!("</{}>", tag.name),
                    });
                }
            }
            _ => {}
        }
    }
}

fn parse_translation(parser: &mut Parser) -> Result<JMneTranslation> {
    let mut translation = JMneTranslation::default();

    loop {
        match parser.next().ok_or("Closing tag </reading> not found")?? {
            Event::ElementStart(tag) => match tag.name.as_str() {
                "name_type" => {
                    translation
                        .name_type
                        .push(parse_characters(parser, "name_type")?);
                }
                "xref" => {
                    translation.xref.push(parse_characters(parser, "xref")?);
                }
                "trans_det" => {
                    if let Some(lang) = tag.attributes.get(&("lang".into(), Some("xml".into()))) {
                        if lang.to_lowercase() != "eng" {
                            println!("<trans_det> has non-english value: {}", lang);
                        }
                    } else {
                        translation
                            .translations
                            .push(parse_characters(parser, "trans_det")?);
                    }
                }
                _ => {
                    println!("Unknown tag in <trans>: {}", &tag.name);
                }
            },
            Event::ElementEnd(tag) => {
                if &tag.name == "trans" {
                    return Ok(translation);
                } else {
                    return Err(Error::Unexpected {
                        expected: "</trans>",
                        actual: format!("</{}>", tag.name),
                    });
                }
            }
            _ => {}
        }
    }
}
