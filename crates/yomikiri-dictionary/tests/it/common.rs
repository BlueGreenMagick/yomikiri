use fs_err as fs;
use std::path::PathBuf;
use yomikiri_dictionary::entry::Entry;

use anyhow::Result;
use yomikiri_dictionary::dictionary::Dictionary;
use yomikiri_dictionary::DICT_FILENAME;

use std::sync::LazyLock;

pub static DICTIONARY: LazyLock<Dictionary<Vec<u8>>> =
    LazyLock::new(|| setup_dictionary().unwrap());

pub fn setup_dictionary() -> Result<Dictionary<Vec<u8>>> {
    let mut base_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    base_dir.push("../yomikiri-dictionary-generator/files");
    let dict_path = base_dir.join(DICT_FILENAME);
    let bytes = fs::read(&dict_path)?;
    let dictionary = Dictionary::try_decode(bytes)?;
    Ok(dictionary)
}

pub fn short_entry_info(entry: &Entry) -> String {
    match entry {
        Entry::Word(entry) => format!("{} (Word: {})", entry.main_form(), entry.id),
        Entry::Name(entry) => format!("{} (Name)", entry.kanji),
    }
}
