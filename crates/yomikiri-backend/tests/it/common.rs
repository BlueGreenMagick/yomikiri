use std::path::{Path, PathBuf};
use std::sync::LazyLock;

use fs_err::File;
use memmap2::{Mmap, MmapOptions};
use yomikiri_dictionary::DICT_FILENAME;
use yomikiri_rs::dictionary::Dictionary;
use yomikiri_rs::tokenize::create_tokenizer;
use yomikiri_rs::SharedBackend;

pub static BACKEND: LazyLock<SharedBackend<Mmap>> = LazyLock::new(|| setup_backend());

fn setup_backend() -> SharedBackend<Mmap> {
    let tokenizer = create_tokenizer();
    let mut base_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    base_dir.push("../yomikiri-dictionary-generator/files");
    let dict_path = base_dir.join(DICT_FILENAME);
    let dictionary = create_dictionary_from_path(&dict_path);
    SharedBackend {
        tokenizer,
        dictionary,
    }
}

fn create_dictionary_from_path<P: AsRef<Path>>(dict_path: P) -> Dictionary<Mmap> {
    let file = File::open(dict_path.as_ref()).unwrap();
    let mmap = unsafe { MmapOptions::new().map(&file) }.unwrap();
    Dictionary::try_new(mmap).unwrap()
}
