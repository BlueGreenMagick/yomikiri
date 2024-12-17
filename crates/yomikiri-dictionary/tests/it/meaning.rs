use insta;
use itertools::Itertools;

use crate::common::{short_entry_info, DICTIONARY};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

macro_rules! test {
    ($name:ident, $meaning: literal, $($val: tt)*) => {
        #[test]
        fn $name() -> Result<()> {
            let dict = DICTIONARY.borrow_view();
            let entries = dict.search_meaning($meaning)?;
            // limit to first 10 entries
            let entries = entries.into_iter().take(10).collect_vec();
            let infos = entries.iter().map(|e| short_entry_info(e)).collect_vec();
            insta::with_settings!({
              info => &entries
            }, {
              insta::assert_yaml_snapshot!(infos, $($val)*);
            });


            Ok(())
        }
    };
}

test!(meaning1, "cat", @r#"
---
- (Word 1467640) 猫
- (Word 1648200) にゃんにゃん
- (Word 2002920) キャット
- (Word 2222730) にゃーにゃー
- (Word 2294040) クレジットカード与信照会用端末
- (Word 2444090) 家猫
- (Word 2520170) カト
- (Word 2535220) ぬこ
- (Word 2698030) 猫
- (Word 2740830) にゃん
"#);

test!(meaning2, "run", @r#"
---
- (Word 1321040) 実行
- (Word 1441390) 点
- (Word 1894690) 続き
- (Word 1281440) 航路
- (Word 1234190) 競走
- (Word 1139940) ラン
- (Word 1160810) ひとっ走り
- (Word 1164380) 一走り
- (Word 1281420) 航程
- (Word 1442140) 伝線
"#);

test!(meaning3, "felis", @r#"
---
- (Word 1900510) ネコ属
- (Word 2858535) 猫座
- (Word 1467640) 猫
- (Word 1969460) ヨーロッパ山猫
- (Word 1969840) リビア山猫
- (Word 2079690) オセロット
- (Word 2231390) 猫蚤
- (Word 2263200) リビア猫
- (Word 2444090) 家猫
- (Word 2696110) ジャングルキャット
"#);
