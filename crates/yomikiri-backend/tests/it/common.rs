use std::path::PathBuf;

use yomikiri_dictionary::DICT_FILENAME;
use yomikiri_rs::dictionary::Dictionary;
use yomikiri_rs::tokenize::create_tokenizer;
use yomikiri_rs::SharedBackend;

pub fn setup_backend() -> SharedBackend<Vec<u8>> {
    let tokenizer = create_tokenizer();
    let mut base_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    base_dir.push("../yomikiri-dictionary-generator/files");
    let dict_path = base_dir.join(DICT_FILENAME);
    let dictionary = Dictionary::from_paths(dict_path.to_str().unwrap()).unwrap();
    SharedBackend {
        tokenizer,
        dictionary,
    }
}
