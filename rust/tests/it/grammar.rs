use std::fs::File;

use yomikiri_rs::SharedBackend;

use crate::common::setup_backend;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

fn test_grammar(
    backend: &mut SharedBackend<File>,
    sentence_inp: &'static str,
    name: &str,
    short: &str,
    check_exist: bool,
) -> Result<()> {
    let char_at = sentence_inp.chars().position(|c| c == '＿').unwrap_or(0);
    let sentence = sentence_inp.replace('＿', "");
    let result = backend.tokenize(&sentence, char_at)?;

    let grammars: Vec<(String, String)> = result
        .grammars
        .iter()
        .map(|g| (g.name.to_string(), g.short.to_string()))
        .collect();
    let exists = grammars
        .iter()
        .any(|(n, s)| (n.as_str(), s.as_str()) == (name, short));

    if check_exist && !exists {
        panic!(
            "Testing sentence: {}\nCould not find grammar ({}, {}) in {:?}",
            sentence_inp, name, short, grammars
        );
    } else if !check_exist && exists {
        panic!(
            "Testing sentence: {}\nFound grammar ({}, {}) in {:?}",
            sentence_inp, name, short, grammars
        );
    }

    if exists != check_exist {
        let msg = if check_exist {
            "Could not find"
        } else {
            "Found"
        };
        panic!(
            "Testing sentence: {}\n{} grammar ({}, {}) in {:?}",
            sentence, msg, name, short, grammars
        );
    }
    Ok(())
}

macro_rules! test {
    ($($test:ident: $name:literal $short:literal $(| $sentence:literal)* $(- $neg_sentence:literal)*)+) => {
      $(
        #[test]
        fn $test() -> Result<()> {
          let mut backend = setup_backend();
          $(
            test_grammar(&mut backend, $sentence, $name, $short, true)?;
          )*
          $(
            test_grammar(&mut backend, $neg_sentence, $name, $short, false)?;
          )*
          Ok(())
        }
      )+
    };
}

test!(
  さ: "ーさ" "objective noun"
    | "便利さ"
    | "カバンの＿重さを測りました。"

  speculativeそう: "ーそう" "speculative adjective"
    | "便利＿じゃなさそう"
    | "美味しそうじゃない"
    | "狭そう"

  command: "ーえ／ーろ" "command form"
    | "ちゃんと黒板＿見ろ！"
    | "やめろよ"
    | "やめろってば"
    | "全力で＿やれ"
    | "ここに＿来い"

  ので: "ので" "cause (so)"
    | "お腹が空いた＿のでレストランに行きました。"
    | "二十歳な＿のでお酒が飲めます。"
    | "彼女は忙しい＿んで、会えません"

  のに: "のに" "unexpectedness (but)"
    | "クーラーをつけた＿のに、全然涼しくならなかった。"
    | "レモン＿なのに甘い"
    - "ミルクは私＿のに入れないでね。"

  が: "ーが" "contrast (but)"
    | "ワインは好きです＿が、ビアは好きないです。"
    | "夏です＿が今日は涼しいです。"

  けれど: "ーけど／ーけれど" "contrast (but)"
    | "夏だ＿けど今日は涼しい。"
    | "ペン持ってないんだ＿けど、貸してくれない？"
    | "分からない＿けれど、一つだけ分かっていることがある。"
    | "もしもし。予約したいんです＿けど…。"

  お: "おー" "honorific"
    | "お預かりする"
    | "お茶"
    | "ご注文"
    | "御国"

  か: "ーか" "unknown"
    | "そうか"
    | "誰＿かがいると思う。"
    | "カレー＿かパスタかを作ると思う"

  から: "ーから" "source"
    | "どこ＿から来たんですか。"
    | "学生＿から社会人になる。"
    | "予定がある＿から遊べない。"

  subjectが: "が" "subject"
    | "あの犬＿が吠えた。"
    | "私＿が社長です。"
    | "梅干＿が大好き。"
    | "日本語＿が分かる。"

  で: "で" "where; how"
    | "バス＿で行きます"
    | "インスタ＿で"
    | "この小説は五つの章＿で構成されている"
    // aux verbs
    // unidic often mistakes aux で(だ) as particle で...
    // - "外国人＿で日本に居る人"
    - "人間＿である"

  られる: "ーられる" "passive suffix"
    | "私は蜂に＿刺された。"
    | "タバコを＿吸われた。"
    | "このお酒は芋から＿作られている"
    | "私が＿閉ざされた"
    | "彼は＿刺されませんでした"

  た: "ーた" "past tense"
  | "本を＿買った。"
  | "日本語が上手に＿なったね。"
  | "フグを＿食べましたか。"
  | "彼が＿死んだ。"
  | "泳いだ。"
);
