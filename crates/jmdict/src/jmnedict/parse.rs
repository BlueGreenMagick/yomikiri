use core::str;
use std::io::BufRead;

use log::warn;
use quick_xml::events::Event;
use quick_xml::Reader;

use crate::jmnedict::types::JMneNameType;
use crate::utils::parse_entity_enum_into;
use crate::xml::{get_next_child_in, parse_string_in_tag_into, TagName, DATE_REG};
use crate::{Error, Result};

use super::types::{JMneDict, JMneEntry, JMneKanji, JMneReading, JMneTranslation};

pub const JMNEDICT_META_ENTRY_ID: u32 = 9999990;

pub struct JMneDictParser<R: BufRead> {
    reader: Reader<R>,
    buf: Vec<u8>,
    creation_date: Option<String>,
}

impl<R: BufRead> JMneDictParser<R> {
    pub fn new(reader: R) -> Result<Self> {
        let mut reader = Reader::from_reader(reader);
        reader.config_mut().trim_text_start = true;
        reader.config_mut().trim_text_end = true;
        reader.config_mut().expand_empty_elements = true;

        let buf = Vec::new();
        let mut parser = JMneDictParser {
            reader,
            buf,
            creation_date: None,
        };
        parser.parse_jmnedict_start()?;
        Ok(parser)
    }

    pub fn next_entry(&mut self) -> Result<Option<JMneEntry>> {
        self.parse_entry_in_jmnedict()
    }

    pub fn creation_date(&self) -> Option<&str> {
        self.creation_date.as_deref()
    }

    fn parse_jmnedict_start(&mut self) -> Result<()> {
        loop {
            self.buf.clear();
            match self.reader.read_event_into(&mut self.buf)? {
                Event::Start(tag) => match tag.name().0 {
                    b"JMnedict" => {
                        return Ok(());
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

    fn parse_entry_in_jmnedict(&mut self) -> Result<Option<JMneEntry>> {
        loop {
            let start = match get_next_child_in(&mut self.reader, &mut self.buf, "JMnedict")? {
                Some(tag) => tag,
                None => return Ok(None),
            };
            match start.name().0 {
                b"entry" => return self.parse_in_entry().map(Some),
                _ => {
                    warn!("Unknown tag in <jmdict>: <{}>", start.tag_name());
                }
            }
        }
    }

    fn parse_in_entry(&mut self) -> Result<JMneEntry> {
        let mut entry = JMneEntry::default();
        let mut id: Option<u32> = None;

        while let Some(tag) = get_next_child_in(&mut self.reader, &mut self.buf, "entry")? {
            match tag.name().0 {
                b"ent_seq" => {
                    if let Some(id) = id {
                        return Err(Error::MultipleEntryIds(id));
                    }
                    let idstr =
                        parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"ent_seq")?;
                    let seq_id = str::parse::<u32>(&idstr)
                        .map_err(|_| format!("Couldn't parse as u32 number: {}", idstr))?;
                    id = Some(seq_id);
                }
                b"k_ele" => {
                    entry.kanjis.push(self.parse_in_kanji()?);
                }
                b"r_ele" => {
                    entry.readings.push(self.parse_in_reading()?);
                }
                b"trans" => {
                    entry.translations.push(self.parse_in_translation()?);
                }
                _ => {
                    warn!("Unknown tag in <entry>: <{}>", &tag.tag_name());
                }
            };
        }

        self.buf.clear();

        if let Some(id) = id {
            entry.id = id;
            if id == JMNEDICT_META_ENTRY_ID {
                self.parse_creation_date(&entry)?;
            }
            Ok(entry)
        } else {
            Err(Error::NoEntryId(self.reader.buffer_position()))
        }
    }

    fn parse_in_kanji(&mut self) -> Result<JMneKanji> {
        let mut kanji: Option<String> = None;
        let mut priorities = vec![];

        while let Some(tag) = get_next_child_in(&mut self.reader, &mut self.buf, "k_ele")? {
            match tag.name().0 {
                b"keb" => {
                    if let Some(kanji) = kanji.as_ref() {
                        warn!(
                            "Warning: Found multiple <keb> in form '{}' in JMneDict",
                            kanji
                        )
                    }
                    kanji = Some(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"keb",
                    )?);
                }
                b"ke_pri" => {
                    let priority =
                        parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"ke_pri")?;
                    priorities.push(priority);
                }
                _ => {
                    warn!("Unknown tag in <k_ele>: {}", tag.tag_name());
                }
            };
        }

        let kanji = kanji.ok_or(Error::InvalidXml("No <keb> found in <k_ele>".into()))?;
        let kanji = JMneKanji {
            kanji,
            priority: priorities,
        };

        Ok(kanji)
    }

    fn parse_in_reading(&mut self) -> Result<JMneReading> {
        let mut reading: Option<String> = None;
        let mut to_kanjis = vec![];
        let mut priorities = vec![];

        while let Some(tag) = get_next_child_in(&mut self.reader, &mut self.buf, "r_ele")? {
            match tag.name().0 {
                b"reb" => {
                    reading = Some(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"reb",
                    )?);
                }
                b"re_restr" => {
                    let to_form =
                        parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"re_restr")?;
                    to_kanjis.push(to_form);
                }
                b"re_pri" => {
                    let priority =
                        parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"re_pri")?;
                    priorities.push(priority);
                }
                _ => {
                    warn!("Unknown tag in <r_ele>: {}", &tag.tag_name());
                }
            };
        }

        let reading = reading.ok_or(Error::InvalidXml("No <reb> found in <r_ele>".into()))?;
        let reading = JMneReading {
            reading,
            to_kanji: to_kanjis,
            priority: priorities,
        };

        Ok(reading)
    }

    fn parse_in_translation(&mut self) -> Result<JMneTranslation> {
        let mut translation = JMneTranslation::default();

        while let Some(tag) = get_next_child_in(&mut self.reader, &mut self.buf, "trans")? {
            match tag.name().0 {
                b"name_type" => {
                    parse_entity_enum_into!(
                        JMneNameType,
                        &mut self.reader,
                        &mut self.buf,
                        "name_type",
                        translation.name_type
                    );
                }
                b"xref" => {
                    translation.xref.push(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"xref",
                    )?);
                }
                b"trans_det" => {
                    let mut is_english = true;
                    for attr in tag.attributes() {
                        let attr = attr?;
                        if attr.key.0 == b"xml:lang" {
                            let lang = attr.value;
                            if lang.as_ref() != b"eng" {
                                println!(
                                    "<trans_det> has non-english value: {}",
                                    str::from_utf8(&lang)?
                                );
                                is_english = false;
                            }
                            break;
                        }
                    }
                    if is_english {
                        let tr_text = parse_string_in_tag_into(
                            &mut self.reader,
                            &mut self.buf,
                            b"trans_det",
                        )?;
                        translation.translations.push(tr_text);
                    }
                }
                _ => {
                    warn!("Unknown tag in <trans>: {}", &tag.tag_name());
                }
            };
        }

        Ok(translation)
    }

    fn parse_creation_date(&mut self, entry: &JMneEntry) -> Result<()> {
        debug_assert_eq!(entry.id, JMNEDICT_META_ENTRY_ID);
        for trans_obj in &entry.translations {
            for translation in &trans_obj.translations {
                if let Some(date) = DATE_REG.find(translation) {
                    self.creation_date = Some(date.as_str().to_owned())
                }
            }
        }
        Ok(())
    }
}

pub fn parse_jmnedict_xml<R: BufRead>(reader: R) -> Result<JMneDict> {
    let mut parser = JMneDictParser::new(reader)?;
    let mut entries = vec![];
    while let Some(entry) = parser.next_entry()? {
        entries.push(entry);
    }
    let creation_date = parser
        .creation_date()
        .ok_or(Error::CreationDateNotFound)?
        .to_owned();
    Ok(JMneDict {
        entries,
        creation_date,
    })
}
