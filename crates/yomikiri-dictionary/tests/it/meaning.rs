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
- (Word 2002920) キャット
- (Word 2294040) クレジットカード与信照会用端末
- (Word 2444090) 家猫
- (Word 2520170) カト
- (Word 2535220) ぬこ
- (Word 2698030) 猫
- (Word 2750480) 唐猫
- (Word 1648200) にゃんにゃん
- (Word 2222730) にゃーにゃー
"#);

test!(meaning2, "run", @r#"
---
- (Word 1139940) ラン
- (Word 1160810) ひとっ走り
- (Word 1164380) 一走り
- (Word 1442140) 伝線
- (Word 2403830) 取り付け騒ぎ
- (Word 2609760) 走
- (Word 1281440) 航路
- (Word 1234190) 競走
- (Word 1281420) 航程
- (Word 2859007) 駆け通し
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

test!(meaning4, "to fly", @r#"
---
- (Word 1429700) 飛ぶ
- (Word 1897780) 飛び翔る
- (Word 2026860) 素っ飛ぶ
- (Word 2432240) ぶっ飛ぶ
- (Word 1575310) 靡かせる
- (Word 1250600) 掲げる
- (Word 1570710) 翔る
- (Word 1523350) 翻る
- (Word 1352320) 上げる
- (Word 1499100) 舞う
"#);
