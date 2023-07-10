use std::fs::File;

use yomikiri_rs::dictionary::Dictionary;
use yomikiri_rs::tokenize::create_tokenizer;
use yomikiri_rs::SharedBackend;

fn setup_backend() -> SharedBackend<File> {
    let tokenizer = create_tokenizer();
    let resources_dir = "../extension/src/assets/jmdict/";
    let index_path = format!("{}{}", resources_dir, "english.yomikiriindex");
    let entries_path = format!("{}{}", resources_dir, "english.yomikiridict");
    let dictionary = Dictionary::from_paths(&index_path, &entries_path).unwrap();
    SharedBackend {
        tokenizer,
        dictionary,
    }
}

#[test]
fn test_tokenize() {
    let mut backend = setup_backend();
    println!("backend set up");
    let result = backend.tokenize("これは例文です。", 0).unwrap();
    assert_eq!(result.selectedTokenIdx, 0);
    assert!(!result.dicEntriesJson.is_empty());
    assert!(result.tokens.len() > 3);
}
