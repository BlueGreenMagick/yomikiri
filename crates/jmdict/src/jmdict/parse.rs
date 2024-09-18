use core::str;
use std::io::BufRead;

use log::warn;
use polonius_the_crab::{polonius, polonius_return};
use quick_xml::events::{BytesStart, Event};
use quick_xml::Reader;

use super::types::{
    JMDialect, JMDict, JMEntry, JMKanji, JMKanjiInfo, JMPartOfSpeech, JMReading, JMSense,
    JMSenseMisc,
};
use crate::jmdict::types::JMReadingInfo;
use crate::utils::parse_entity_enum;
use crate::xml::{parse_in_tag, parse_string_in_tag, TagName};
use crate::{Error, Result};

struct JMDictParser<R: BufRead> {
    reader: Reader<R>,
    buf: Vec<u8>,
}

impl<R: BufRead> JMDictParser<R> {
    pub fn new(reader: R) -> Self {
        let reader = Reader::from_reader(reader);
        let buf = Vec::new();
        JMDictParser { reader, buf }
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
                    let idstr = self.parse_string_in_tag(b"ent_seq")?;
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
        unimplemented!()
    }

    fn parse_in_reading(&mut self) -> Result<JMReading> {
        unimplemented!()
    }

    fn parse_in_sense(&mut self) -> Result<JMSense> {
        unimplemented!()
    }

    fn parse_string_in_tag(&mut self, tag: &[u8]) -> Result<String> {
        unimplemented!()
    }
}

fn get_next_child_in<'b, R: BufRead>(
    reader: &mut Reader<R>,
    mut buf: &'b mut Vec<u8>,
    tag: &str,
) -> Result<Option<BytesStart<'b>>> {
    loop {
        polonius!(|buf| -> Result<Option<BytesStart<'polonius>>> {
            buf.clear();

            let ev = match reader.read_event_into(buf) {
                Ok(ev) => ev,
                Err(err) => {
                    polonius_return!(Err(err.into()))
                }
            };
            match ev {
                Event::Start(start) => polonius_return!(Ok(Some(start))),
                Event::End(end) => {
                    if end.name().0 == tag.as_bytes() {
                        polonius_return!(Ok(None));
                    }
                }
                Event::Eof => {
                    polonius_return!(Err(Error::InvalidXml(format!("<{}> not closed", tag))))
                }
                _ => {}
            }
        })
    }
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
                entry.kanjis.push(form);
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

pub fn parse_in_form(reader: &mut Reader<&[u8]>) -> Result<JMKanji> {
    let mut form = JMKanji::default();

    parse_in_tag(reader, "k_ele", |reader, tag| {
        match tag.name().0 {
            b"keb" => {
                if !form.kanji.is_empty() {
                    warn!("Found multiple <keb> in form '{}' in JMDict", form.kanji)
                }
                form.kanji = parse_string_in_tag(reader, b"keb")?;
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
                parse_entity_enum!(reader, JMPartOfSpeech, "pos", sense.pos);
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
                parse_entity_enum!(reader, JMDialect, "dial", sense.dialects);
            }
            b"gloss" => {
                sense.meanings.push(parse_string_in_tag(reader, b"gloss")?);
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
