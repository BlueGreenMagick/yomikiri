use std::fs::File;

use yomikiri_rs::SharedBackend;

use crate::common::setup_backend;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

fn test_grammar(
    backend: &mut SharedBackend<File>,
    sentence: &'static str,
    rules: &[&'static str],
) -> Result<()> {
    let char_at = sentence
        .chars()
        .position(|c| c == '＿')
        .unwrap_or_else(|| panic!("'＿' not found in sentence: {}", &sentence));
    let sentence = sentence.replace('＿', "");
    let result = backend.tokenize(&sentence, char_at)?;
    let grammars: Vec<String> = result.grammars.iter().map(|g| g.name.to_string()).collect();

    for rule in rules {
        if !grammars.iter().any(|g| g == rule) {
            panic!(
                "Testing sentence: {}\nCould not find grammar {} in [{}]",
                sentence,
                rule,
                grammars.join(",")
            );
        }
    }
    Ok(())
}

macro_rules! test {
    ($($test:ident : $(| $sentence:literal $($name:literal)+)+)+) => {
      $(
        #[test]
        fn $test() -> Result<()> {
          let mut backend = setup_backend();
          $(
            let rules = vec![$($name),+];
            test_grammar(&mut backend, $sentence, &rules)?;
          )+
          Ok(())
        }
      )+
    };
}

test!(
  られる:
    | "私は蜂に＿刺された。" "ーられる" "ーた"
    | "タバコを＿吸われた。" "ーられる" "ーた"
    | "このお酒は芋から＿作られている" "ーられる"
    | "私が＿閉ざされた" "ーられる" "ーた"
    | "彼は＿刺されませんでした" "ーられる" "ーた"

  た:
  | "本を＿買った。" "ーた"
  | "日本語が上手に＿なったね。" "ーた"
  | "フグを＿食べましたか。" "ーた"
  | "彼が＿死んだ。" "ーた"
  | "＿泳いだ。" "ーた"
);
