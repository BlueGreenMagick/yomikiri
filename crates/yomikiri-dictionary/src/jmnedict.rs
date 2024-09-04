use itertools::Itertools;
use yomikiri_jmdict::jmnedict::{JMneEntry, JMneNameType};

use crate::name::{NameEntry, NameEntryKind};
use crate::{Error, Result};

pub fn parse_jmnedict_xml(xml: &str) -> Result<Vec<NameEntry>> {
    let jmnedict = yomikiri_jmdict::jmnedict::parse_jmnedict_xml(xml)?;
    let entries = jmnedict
        .entries
        .into_iter()
        .map(NameEntry::try_from)
        .try_collect()?;
    Ok(entries)
}

impl TryFrom<JMneEntry> for NameEntry {
    type Error = Error;

    // Put entries with higher priority first
    fn try_from(value: JMneEntry) -> Result<Self> {
        unimplemented!()
    }
}
