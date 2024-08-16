pub mod error;
pub mod jmdict;
pub mod xml;

use jmdict::JMDict;

pub use crate::error::Error;
pub use crate::jmdict::{JMEntry, JMForm, JMReading, JMSense};
use crate::xml::{parse_xml, remove_doctype, unescape_entity};

pub type Result<T> = core::result::Result<T, Error>;

pub fn parse_jmdict_xml(xml: &str) -> Result<JMDict> {
    let xml = remove_doctype(xml);
    let xml = unescape_entity(&xml);
    let jmdict = parse_xml(&xml)?;
    Ok(jmdict)
}
