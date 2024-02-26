use crate::common::setup_backend;
use yomikiri_rs::error::YResult;
use yomikiri_rs::tokenize::Token;

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
                let result = backend.tokenize(&text, 0)?;
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
    let result = backend.tokenize("これは例文です。", 0).unwrap();
    assert_eq!(result.tokenIdx, 0);
    assert!(!result.entries.is_empty());
    assert!(result.tokens.len() > 3);
}

tokenize_tests! {
    // # Basic
    basic1: "私/は/学生/です",

    // # Multi: expressions, nouns, conjunctions
    // 「じゃない」(exp,adj-i)＜助動詞「じゃ｜だ」＋形容詞「なかっ」＋助動詞「た」>
    multi1: "この/本/は/最高/じゃなかった",
    // 「かもしれない」(exp)＜副助詞「か」係助詞「も」動詞「しれ」助動詞「ない」＞
    multi2: "魚フライ/を/食べた/かもしれない/猫",
    // 「について」(exp)＜格助詞「に」動詞「つい」接続助詞「て」＞
    multi3: "地震/について/語る",
    // 「には」(prt)<助詞「に」助詞「は」＞
    multi4: "街/には/行く",
    // 「それで」(conj)＜「それ」格助詞「で」＞
    multi5: "それで/読めた",

    // # Inflection
    // 「きそう」＜き「動詞」そう「形状詞/助動詞語幹」な「助動詞」＞
    inf1: "聞こえて/きそうな/くらい",
    // 「生まれる」＜動詞「生まれ」、助動詞「まし」、助動詞「た」＞
    inf2: "赤ちゃん/が/生まれました",
    // 「する」＜動詞「し」、助動詞「ませ」、助動詞「ん」、助動詞「でし」助動詞「た」＞
    inf3: "だから/しませんでした",
    // な「助動詞」
    inf4: "静かな/日",
    // 接続助詞 that contains kanji should not join
    // 聞き「動詞」/乍ら「助詞/接続助詞」
    inf5: "ラジオ/を/聞き/乍ら/勉強/する",
    // 美味しい「形容詞」/そう「形状詞/助動詞語幹」
    inf6: "美味しそう",
    // Don't join ーそう「名詞/助動詞語幹」 as in hearsay
    inf7: "美味しい/そうです",


    // # Prefix
    // 「全否定」＜接頭辞「全」名詞「否定」＞
    pref1: "全否定",
    // prefix + suffix
    // 「お母さん」（n)＜接頭辞「お」名詞「母」接尾辞「さん」＞
    pref2: "お母さん/だ",

    // # Pre-noun
    // 「この間」(n)<連体詞「この」名詞「間」＞
    pren12: "この間/は",

    // # Other
    // don't compound. 私/はしる is wrong
    other1: "私/は/しる",


}

// If string passed to tokenizer is not in NFC normalized form,
// token text must be in NFC normalized form,
// but token.start must be starting character position in un-normalized string
#[test]
fn decomposed_unicode() -> YResult<()> {
    let mut backend = setup_backend();
    // か\u3099 = が
    let result = backend.tokenize("本か\u{3099}好きだ", 2)?;
    let start_indices: Vec<u32> = result.tokens.iter().map(|t| t.start).collect();
    assert_eq!(start_indices[0], 0);
    assert_eq!(start_indices[1], 1);
    assert_eq!(start_indices[2], 3);
    assert_eq!(&result.tokens[1].text, "が");
    Ok(())
}

#[test]
fn empty_string() -> YResult<()> {
    let mut backend = setup_backend();
    let result = backend.tokenize("", 0)?;
    assert_eq!(result.tokenIdx, -1);
    Ok(())
}
