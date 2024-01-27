use std::fs::File;
use std::path::PathBuf;

use yomikiri_rs::dictionary::Dictionary;
use yomikiri_rs::error::YResult;
use yomikiri_rs::tokenize::{create_tokenizer, Token};
use yomikiri_rs::SharedBackend;

fn setup_backend() -> SharedBackend<File> {
    let tokenizer = create_tokenizer();
    let mut base_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    base_dir.push("../dictionary/resources");
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

fn surface_pos_string(tokens: &[Token]) -> String {
    let mut output = String::new();
    let mut iter = tokens.iter();
    let token = match iter.next() {
        Some(t) => t,
        None => return output,
    };

    output.push_str(&token.text);
    output.push_str("「");
    output.push_str(&token.pos);
    output.push_str("」");

    for token in iter {
        output.push_str("/");
        output.push_str(&token.text);
        output.push_str("「");
        output.push_str(&token.pos);
        output.push_str("」");
    }
    output
}

macro_rules! tokenize_tests {
    ($($name:ident: $expected:expr,)*) => {
        $(
            #[test]
            fn $name() -> YResult<()> {
                let mut backend = setup_backend();
                let expected = $expected;
                let text = expected.replace("/", "");
                let result = backend.tokenize(&text, 0, false)?;
                let result_string = result
                    .tokens
                    .iter()
                    .map(|t| t.text.as_str())
                    .collect::<Vec<&str>>()
                    .join("/");
                if result_string != expected {
                    panic!("{}\nexpected: {}", surface_pos_string(&result.tokens), expected)
                }
                Ok(())
            }
        )*
    }
}

#[test]
fn test_tokenize() {
    let mut backend = setup_backend();
    let result = backend.tokenize("これは例文です。", 0, false).unwrap();
    assert_eq!(result.tokenIdx, 0);
    assert!(!result.mainEntries.is_empty());
    assert!(result.tokens.len() > 3);
}

tokenize_tests! {
    case1: "私/は/学生/です",
    // 「じゃない」(exp,adj-i)＜助動詞「じゃ｜だ」＋形容詞「なかっ」＋助動詞「た」>
    case2: "この/本/は/最高/じゃなかった",
    // 「かもしれない」(exp)＜副助詞「か」係助詞「も」動詞「しれ」助動詞「ない」＞
    case3: "魚フライ/を/食べた/かもしれない/猫",
    // 「について」(exp)＜格助詞「に」動詞「つい」接続助詞「て」＞
    case4: "地震/について/語る",
    // 「には」(prt)<助詞「に」助詞「は」＞
    case5: "街/には/行く",
    // 「それで」(conj)＜「それ」格助詞「で」＞
    case6: "それで/読めた",
    // # Inflection
    // 「そう」＜形状詞「そう」助動詞「な」＞
    case7: "聞こえて/き/そうな/くらい",
    // 「生まれる」＜動詞「生まれ」、助動詞「まし」、助動詞「た」＞
    case8: "赤ちゃん/が/生まれました",
    // 「する」＜動詞「し」、助動詞「ませ」、助動詞「ん」、助動詞「でし」助動詞「た」＞
    case9: "だから/しませんでした",
    // # Prefix
    // 「全否定」＜接頭辞「全」名詞「否定」＞
    case10: "全否定",
    // 「お母さん」（n)＜接頭辞「お」名詞「母」接尾辞「さん」＞
    case11: "お母さん/だ",
    // 「この間」(n)<連体詞「この」名詞「間」＞
    case12: "この間/は",
    // don't compound. 私/はしる is wrong
    case13: "私/は/しる",
    // 「静かな」(adj)
    case14: "静かな/日",
    // 接続助詞 that contains kanji should not join
    // 聞き「動詞」/乍ら「助詞/接続助詞」
    case15: "ラジオ/を/聞き/乍ら/勉強/する",
}

#[test]
fn decomposed_unicode() -> YResult<()> {
    let mut backend = setup_backend();
    // か\u3099 = が
    let result = backend.tokenize("本か\u{3099}好きだ", 2, false)?;
    let start_indices: Vec<u32> = result.tokens.iter().map(|t| t.start).collect();
    assert_eq!(start_indices[0], 0);
    assert_eq!(start_indices[1], 1);
    assert_eq!(start_indices[2], 3);
    assert_eq!(&result.tokens[1].text, "が");
    Ok(())
}
