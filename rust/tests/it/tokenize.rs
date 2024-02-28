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
    // # 1. any+ => exp
    // 「じゃない」(exp,adj-i)＜助動詞「じゃ｜だ」＋形容詞「なかっ」＋助動詞「た」>
    exp1: "この/本/は/最高/じゃなかった",
    // 「かもしれない」(exp)＜副助詞「か」係助詞「も」動詞「しれ」助動詞「ない」＞
    exp2: "魚フライ/を/食べた/かもしれない/猫",
    // 「について」(exp)＜格助詞「に」動詞「つい」接続助詞「て」＞
    exp3: "地震/について/語る",

    // ## 3. 助詞+
    // 「には」(prt)<助詞「に」助詞「は」＞
    part1: "街/には/行く",
    // んい「のに」(助詞)＜助詞「の」助詞「に」＞
    part2: "だから/言った/んに",

    // ## 4. (名詞|代名詞) 助詞+
    // 「誰か」(pron)＜代名詞「だれ」助詞「か」＞
    npart1: "誰か/来た/よ",
    // 「何とも」(adv)＜代名詞「何」助詞「と」助詞「も」＞
    npart2: "何とも/言えません",
    // 「誠に」(adv)＜名詞「誠」助詞「に」＞
    npart3: "誠に/申し訳ありません",


    // # Subsequent Verbs
    // 運動 + する
    verb_する1: "彼/は/運動する",
    // 旅行 + する
    verb_する2: "私/は/旅行しました",
    // 食べる + なさい「為さる」
    verb_なさい: "たくさん/食べなさい",

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
    inf5: "ラジオ/を/聞き/乍ら/勉強する",
    // 美味しい「形容詞」/そう「形状詞/助動詞語幹」
    inf6: "美味しそう",
    // Don't join ーそう「名詞/助動詞語幹」 as in hearsay
    inf7: "美味しい/そうです",
    // 「ーたり」 is to be considered as inflection
    inf8: "ここ/は/暑かったり/寒かったり/します",

    // # Prefix
    // 「全否定」＜接頭辞「全」名詞「否定」＞
    pref1: "全否定",
    // prefix + suffix
    // 「お母さん」（n)＜接頭辞「お」名詞「母」接尾辞「さん」＞
    pref2: "お母さん/だ",

    // # Suffix
    // 形容詞「羨ましい」＋接尾辞「がる」
    suf1: "彼/は/羨ましがった",

    // # Pre-noun
    // 「この間」(n)<連体詞「この」名詞「間」＞
    pren12: "この間/は",

    // # Conjunction
    // 「それで」(conj)＜「それ」格助詞「で」＞
    conj1: "それで/読めた",

    // # Other
    // don't compound. 私/はしる is wrong
    other1: "私/は/しる",
    // below 「と」 is 接続助詞, not 格助詞
    other2: "早く/起きないと/遅刻する/よ",


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
