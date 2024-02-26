use std::fs::File;

use yomikiri_rs::SharedBackend;

use crate::common::setup_backend;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

fn test_grammar(
    backend: &mut SharedBackend<File>,
    sentence: &'static str,
    name: &str,
    short: &str,
) -> Result<()> {
    let char_at = sentence.chars().position(|c| c == '＿').unwrap_or(0);
    let sentence = sentence.replace('＿', "");
    let result = backend.tokenize(&sentence, char_at)?;

    let grammars: Vec<(String, String)> = result
        .grammars
        .iter()
        .map(|g| (g.name.to_string(), g.short.to_string()))
        .collect();
    if !grammars
        .iter()
        .any(|(n, s)| (n.as_str(), s.as_str()) == (name, short))
    {
        panic!(
            "Testing sentence: {}\nCould not find grammar ({}, {}) in [{:?}]",
            sentence, name, short, grammars
        );
    }
    Ok(())
}

macro_rules! test {
    ($($test:ident: $name:literal $short:literal $(| $sentence:literal)+)+) => {
      $(
        #[test]
        fn $test() -> Result<()> {
          let mut backend = setup_backend();
          $(
            test_grammar(&mut backend, $sentence, $name, $short)?;
          )+
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
