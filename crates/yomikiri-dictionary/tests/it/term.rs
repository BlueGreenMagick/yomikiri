//! JMDict and JMnedict XML are shared between all tests.
//!
//! New entries may be added to the XML, so tests must not test that some entry does not exist.
//! However, tests may assume that no new entries will be added with identical terms.

use insta;
use itertools::Itertools;

use crate::common::{order_entries, short_entry_info, DICTIONARY};

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

macro_rules! test_term {
    ($name:ident, $term: literal, $($val: tt)*) => {
        #[test]
        fn $name() -> Result<()> {
            let dict = &*DICTIONARY;
            let term_index = &dict.borrow_view().term_index;
            let idxs = term_index.get($term)?;
            let mut entries = dict.borrow_view().get_entries(&idxs)?;
            entries.sort_by(order_entries);
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

test_term!(term1, "いじり回す", @r#"
---
- (Word 1000810) いじり回す
"#);

test_term!(term2, "鏑木", @r#"
---
- (Name) 鏑木
"#);

test_term!(term3, "猫", @r#"
---
- (Name) 猫
- (Word 1467640) 猫
- (Word 2698030) 猫
"#);

test_term!(term4, "ある", @r#"
---
- (Word 1296400) 有る
- (Word 1586840) 或る
- (Word 5100071) 唖瑠
- (Word 5102621) 阿留
- (Word 5112048) 安留
- (Word 5117154) 偉
"#);

test_term!(term5, "未", @r#"
---
- (Name) 未
- (Word 1527090) 未
- (Word 2242840) 未
- (Word 5657376) 未
"#);
