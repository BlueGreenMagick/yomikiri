use core::str;
use std::io::BufRead;

use log::warn;
use quick_xml::events::Event;
use quick_xml::Reader;

use super::types::{
    JMDialect, JMDict, JMEntry, JMKanji, JMKanjiInfo, JMPartOfSpeech, JMReading, JMSense,
    JMSenseMisc,
};
use crate::jmdict::types::JMReadingInfo;
use crate::utils::parse_entity_enum_into;
use crate::xml::{get_next_child_in, parse_string_in_tag_into, TagName};
use crate::{Error, Result};

struct JMDictParser<R: BufRead> {
    reader: Reader<R>,
    buf: Vec<u8>,
}

impl<R: BufRead> JMDictParser<R> {
    pub fn new(reader: R) -> Result<Self> {
        let mut reader = Reader::from_reader(reader);
        reader.config_mut().trim_text_start = true;
        reader.config_mut().trim_text_end = true;
        reader.config_mut().expand_empty_elements = true;

        let buf = Vec::new();
        let mut parser = JMDictParser { reader, buf };
        parser.parse_jmdict_start()?;
        Ok(parser)
    }

    fn parse_jmdict_start(&mut self) -> Result<()> {
        loop {
            self.buf.clear();
            match self.reader.read_event_into(&mut self.buf)? {
                Event::Start(tag) => match tag.name().0 {
                    b"JMdict" => return Ok(()),
                    _ => {
                        warn!("Unknown global tag: {}", tag.tag_name());
                    }
                },
                Event::Eof => return Err(Error::InvalidXml("<JMdict> not found".into())),
                _ => {}
            }
        }
    }

    fn parse_entry_in_jmdict(&mut self) -> Result<Option<JMEntry>> {
        loop {
            let start = match get_next_child_in(&mut self.reader, &mut self.buf, "JMdict")? {
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

    fn parse_in_entry(&mut self) -> Result<JMEntry> {
        let mut id: Option<u32> = None;
        let mut entry = JMEntry::default();

        while let Some(start) = get_next_child_in(&mut self.reader, &mut self.buf, "entry")? {
            match start.name().0 {
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
                    let form = self.parse_in_form()?;
                    entry.kanjis.push(form);
                }
                b"r_ele" => {
                    let reading = self.parse_in_reading()?;
                    entry.readings.push(reading);
                }
                b"sense" => {
                    let sense = self.parse_in_sense()?;
                    entry.senses.push(sense);
                }
                _ => {
                    warn!("Unknown tag in <entry>: <{}>", start.tag_name())
                }
            };
        }

        if let Some(id) = id {
            entry.id = id;
            return Ok(entry);
        } else {
            return Err(Error::NoEntryId(self.reader.buffer_position()));
        }
    }

    fn parse_in_form(&mut self) -> Result<JMKanji> {
        let mut form = JMKanji::default();

        while let Some(tag) = get_next_child_in(&mut self.reader, &mut self.buf, "k_ele")? {
            match tag.name().0 {
                b"keb" => {
                    if !form.kanji.is_empty() {
                        warn!("Found multiple <keb> in form '{}' in JMDict", form.kanji)
                    }
                    form.kanji = parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"keb")?;
                }
                b"ke_inf" => {
                    parse_entity_enum_into!(
                        JMKanjiInfo,
                        &mut self.reader,
                        &mut self.buf,
                        "ke_inf",
                        form.info
                    );
                }
                b"ke_pri" => {
                    form.priority.push(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"ke_pri",
                    )?);
                }
                _ => {
                    warn!("Unknown tag in <entry>: {}", tag.tag_name());
                }
            };
        }

        Ok(form)
    }

    fn parse_in_reading(&mut self) -> Result<JMReading> {
        let mut reading = JMReading::default();

        while let Some(tag) = get_next_child_in(&mut self.reader, &mut self.buf, "r_ele")? {
            match tag.name().0 {
                b"reb" => {
                    reading.reading =
                        parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"reb")?;
                }
                b"re_nokanji" => {
                    reading.nokanji = true;
                    // consume ending tag
                    parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"re_nokanji")?;
                }
                b"re_restr" => {
                    reading.to_form.push(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"re_restr",
                    )?);
                }
                b"re_inf" => {
                    parse_entity_enum_into!(
                        JMReadingInfo,
                        &mut self.reader,
                        &mut self.buf,
                        "re_inf",
                        reading.info
                    );
                }
                b"re_pri" => {
                    reading.priority.push(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"re_pri",
                    )?);
                }
                _ => {
                    warn!("Unknown tag in <r_ele>: {}", &tag.tag_name());
                }
            };
        }

        Ok(reading)
    }

    fn parse_in_sense(&mut self) -> Result<JMSense> {
        let mut sense = JMSense::default();

        while let Some(tag) = get_next_child_in(&mut self.reader, &mut self.buf, "sense")? {
            match tag.name().0 {
                b"stagk" => {
                    sense.to_form.push(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"stagk",
                    )?);
                }
                b"stagr" => {
                    sense.to_reading.push(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"stagr",
                    )?);
                }
                b"pos" => {
                    parse_entity_enum_into!(
                        JMPartOfSpeech,
                        &mut self.reader,
                        &mut self.buf,
                        "pos",
                        sense.pos
                    );
                }
                b"xref" => {
                    parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"xref")?;
                }
                b"ant" => {
                    parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"ant")?;
                }
                b"field" => {
                    parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"field")?;
                }
                b"misc" => {
                    parse_entity_enum_into!(
                        JMSenseMisc,
                        &mut self.reader,
                        &mut self.buf,
                        "misc",
                        sense.misc
                    );
                }
                b"s_inf" => {
                    sense.info.push(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"s_inf",
                    )?);
                }
                b"dial" => {
                    parse_entity_enum_into!(
                        JMDialect,
                        &mut self.reader,
                        &mut self.buf,
                        "dial",
                        sense.dialects
                    );
                }
                b"gloss" => {
                    sense.meanings.push(parse_string_in_tag_into(
                        &mut self.reader,
                        &mut self.buf,
                        b"gloss",
                    )?);
                }
                b"lsource" => {
                    // consume ending tag
                    parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"lsource")?;
                }
                b"example" => {
                    parse_string_in_tag_into(&mut self.reader, &mut self.buf, b"example")?;
                }
                _ => {
                    warn!("Unknown tag in <sense>: {}", tag.tag_name());
                }
            };
        }

        Ok(sense)
    }
}

pub fn parse_jmdict_xml(xml: &str) -> Result<JMDict> {
    let mut parser = JMDictParser::new(xml.as_bytes())?;
    let mut entries = vec![];
    while let Some(entry) = parser.parse_entry_in_jmdict()? {
        entries.push(entry);
    }
    Ok(JMDict { entries })
}
