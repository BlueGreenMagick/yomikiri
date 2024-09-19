//! XML parsing aims to not throw errors when
//! parsing future versions of dictionary xml files.
//!
//! When unknown variant, entity, or tags are encountered, the parser ignores it.
//!
//! Meanwhile, some core assumptions on its structure must be held.
//! For example, an element must have one and only one id.
use lazy_regex::{lazy_regex, Lazy, Regex};
use polonius_the_crab::{polonius, polonius_return};
use quick_xml::escape::{resolve_predefined_entity, unescape_with};
use quick_xml::events::{BytesEnd, BytesStart, Event};
use quick_xml::reader::Reader;

use core::str;
use std::borrow::Cow;
use std::io::BufRead;

use crate::{Error, Result};

pub trait TagName<'a>
where
    Self: 'a,
{
    /** Returns "\<Invalid UTF-8\>" if tag name is not valid utf-8 */
    fn tag_name(&'a self) -> &'a str;
}

impl<'a> TagName<'a> for BytesStart<'a> {
    fn tag_name(&'a self) -> &'a str {
        str::from_utf8(self.name().0).unwrap_or("<Invalid UTF-8>")
    }
}

impl<'a> TagName<'a> for BytesEnd<'a> {
    fn tag_name(&'a self) -> &'a str {
        str::from_utf8(self.name().0).unwrap_or("<Invalid UTF-8>")
    }
}

pub(crate) static DATE_REG: Lazy<Regex> = lazy_regex!(r#"\d\d\d\d-\d\d-\d\d"#);

pub fn parse_string_in_tag_into<R: BufRead>(
    reader: &mut Reader<R>,
    buf: &mut Vec<u8>,
    in_tag: &[u8],
) -> Result<String> {
    let characters = parse_text_in_tag_into(reader, buf, in_tag)?;
    let string = str::from_utf8(&characters)?;
    let string = resolve_custom_entity_item(string);
    let string = unescape_with(&string, unescape_entity)?;
    Ok(string.into())
}

pub fn parse_text_in_tag_into<R: BufRead>(
    reader: &mut Reader<R>,
    buf: &mut Vec<u8>,
    in_tag: &[u8],
) -> Result<Vec<u8>> {
    let mut characters = Vec::new();
    loop {
        buf.clear();
        match reader.read_event_into(buf)? {
            Event::Start(tag) => {
                return Err(Error::Unexpected {
                    expected: "text".into(),
                    actual: format!("starting tag <{}>", tag.tag_name()),
                });
            }
            Event::Text(text) => {
                let text = text.into_inner();
                characters.extend_from_slice(&text);
            }
            Event::End(tag) => {
                if tag.name().0 == in_tag {
                    return Ok(characters);
                } else {
                    return Err(Error::Unexpected {
                        expected: format!("ending tag </{}>", tag.tag_name()),
                        actual: format!("ending tag </{}>", tag.tag_name()),
                    });
                }
            }
            _ => {
                unimplemented!()
            }
        }
    }
}

/// Resolves entity in text that only contains 1 custom entity and no other text
///
/// '&ent;' is resolved to '=ent='.
fn resolve_custom_entity_item(text: &str) -> Cow<'_, str> {
    if !text.starts_with('&') || !text.ends_with(';') {
        Cow::Borrowed(text)
    } else {
        let inner = &text[1..text.len() - 1];
        if inner.contains(';') {
            Cow::Borrowed(text)
        } else {
            let resolved = format!("={}=", inner);
            Cow::Owned(resolved)
        }
    }
}

/// Unescapes xml entities, resolving custom entities to empty string "".
///
/// Custom entities should be handled before this function is used to unescape entity.
fn unescape_entity(entity: &str) -> Option<&'static str> {
    if let Some(unescaped) = resolve_predefined_entity(entity) {
        Some(unescaped)
    } else {
        Some("")
    }
}

pub fn get_next_child_in<'b, R: BufRead>(
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
