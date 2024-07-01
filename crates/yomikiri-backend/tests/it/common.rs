use std::fs::File;
use std::path::PathBuf;

use yomikiri_rs::dictionary::Dictionary;
use yomikiri_rs::tokenize::create_tokenizer;
use yomikiri_rs::SharedBackend;

pub fn setup_backend() -> SharedBackend<File> {
    let tokenizer = create_tokenizer();
    let mut base_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    base_dir.push("../dictionary/res");
    let index_path = base_dir.join("english.yomikiriindex");
    let entries_path = base_dir.join("english.yomikiridict");
    let dictionary =
        Dictionary::from_paths(index_path.to_str().unwrap(), entries_path.to_str().unwrap())
            .unwrap();
    SharedBackend {
        tokenizer,
        dictionary,
    }
}
