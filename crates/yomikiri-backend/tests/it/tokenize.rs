use crate::common::BACKEND;
use anyhow::Result;
use insta;
use yomikiri_rs::tokenize::Token;

/// Generate sentence from tokenization result
/// where tokens are split with '/'
fn tokenized_sentence(tokens: &[Token]) -> String {
    let token_texts: Vec<&str> = tokens.into_iter().map(|t| t.text.as_str()).collect();
    token_texts.join("/")
}

macro_rules! test {
    ($name: ident, $sentence: expr, $($val: tt)*) => {
        #[test]
        fn $name() -> Result<()> {
            let result = BACKEND.tokenize($sentence, 0)?;
            let tokenized = tokenized_sentence(&result.tokens);
            insta::with_settings!({
                info => &result.tokens
            }, {
                insta::assert_snapshot!(&tokenized, $($val)*)
            });
            Ok(())
        }
    }
}

#[test]
fn test_tokenize() {
    let result = BACKEND.tokenize("これは例文です。", 0).unwrap();
    assert_eq!(result.tokenIdx, 0);
    assert!(!result.entries.is_empty());
    assert!(result.tokens.len() > 3);
}

// If string passed to tokenizer is not in NFC normalized form,
// token text must be in NFC normalized form,
// but token.start must be starting character position in un-normalized string
#[test]
fn decomposed_unicode() -> Result<()> {
    // か\u3099 = が
    let result = BACKEND.tokenize("本か\u{3099}好きだ", 2)?;
    let start_indices: Vec<u32> = result.tokens.iter().map(|t| t.start).collect();
    assert_eq!(start_indices[0], 0);
    assert_eq!(start_indices[1], 1);
    assert_eq!(start_indices[2], 3);
    assert_eq!(&result.tokens[1].text, "が");
    Ok(())
}

#[test]
fn empty_string() -> Result<()> {
    let result = BACKEND.tokenize("", 0)?;
    assert_eq!(result.tokenIdx, -1);
    Ok(())
}

// # Basic
test!(basic1, "私は学生です", @"私/は/学生/です");

// # Multi: expressions, nouns, conjunctions
// ## 1. any+ => exp
test!(exp1, "この本は最高じゃなかった", @"この/本/は/最高/じゃなかった");
test!(exp2, "魚フライを食べたかもしれない猫", @"魚フライ/を/食べた/かもしれない/猫");
test!(exp3, "地震について語る", @"地震/について/語る");

// ## 3. 助詞+
test!(part1, "街には行く", @"街/には/行く");
test!(part2, "だから言ったんに", @"だから/言った/んに");

// ## 4. (名詞|代名詞) 助詞+
test!(npart1, "誰か来たよ", @"誰か/来た/よ");
// ## 4. (名詞|代名詞) 助詞+
test!(npart2, "何とも言えません", @"何とも/言えません");
test!(npart3, "誠に申し訳ありません", @"誠に/申し訳ありません");

// ## 5. 動詞 動詞／非自立可能
test!(v1, "本を読み切る", @"本/を/読み切る");

// # Subsequent Verbs
test!(verb_する1, "彼は運動する", @"彼/は/運動する");
test!(verb_する2, "私は旅行しました", @"私/は/旅行しました");
test!(verb_なさい, "たくさん食べなさい", @"たくさん/食べなさい");

// # Inflection
test!(inf1, "聞こえてきそうなくらい", @"聞こえて/きそうな/くらい");
test!(inf2, "赤ちゃんが生まれました", @"赤ちゃん/が/生まれました");
test!(inf3, "だからしませんでした", @"だから/しませんでした");
test!(inf4, "静かな日", @"静かな/日");
test!(inf5, "ラジオを聞き乍ら勉強する", @"ラジオ/を/聞き/乍ら/勉強する");
test!(inf6, "美味しそう", @"美味しそう");
test!(inf7, "美味しいそうです", @"美味しい/そうです");
test!(inf8, "ここは暑かったり寒かったりします", @"ここ/は/暑かったり/寒かったり/します");
test!(inf9, "これは本でした", @"これは/本/でした");

// # Prefix
test!(pref1, "全否定", @"全否定");
test!(pref2, "お母さんだ", @"お母さん/だ");

// # Suffix
test!(suf1, "彼は羨ましがった", @"彼/は/羨ましがった");

// # Pre-noun
test!(pren12, "この間は", @"この間/は");

// # Conjunction
test!(conj1, "それで読めた", @"それで/読めた");

// # Other
test!(other1, "私はしる", @"私/は/しる");
test!(other2, "早く起きないと遅刻するよ", @"早く/起きないと/遅刻する/よ");
test!(other3, "ごはんはさしみだったりやきそばおにぎりだったりする", @"ごはん/は/さしみ/だったり/やきそば/おにぎり/だったり/する");
