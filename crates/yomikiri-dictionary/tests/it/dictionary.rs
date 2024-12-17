//! JMDict and JMnedict XML are shared between all tests.
//!
//! New entries may be added to the XML, so tests must not test that some entry does not exist.
//! However, tests may assume that no new entries will be added with identical terms.

use yomikiri_dictionary::dictionary::{Dictionary, DictionaryWriter};
use yomikiri_dictionary::entry::Entry;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

const JMDICT_XML: &'static str = r#"<?xml version="1.0" encoding="UTF-8"?>
<!-- JMdict created: 2024-08-23 -->
<JMdict>
<entry>
  <ent_seq>1000810</ent_seq>
  <k_ele>
  <keb>いじり回す</keb>
  </k_ele>
  <k_ele>
  <keb>弄り回す</keb>
  </k_ele>
  <k_ele>
  <keb>弄りまわす</keb>
  </k_ele>
  <r_ele>
  <reb>いじりまわす</reb>
  </r_ele>
  <sense>
  <pos>&v5s;</pos>
  <pos>&vt;</pos>
  <gloss>to tinker with</gloss>
  <gloss>to fumble with</gloss>
  <gloss>to fiddle with</gloss>
  <gloss>to twiddle</gloss>
  </sense>
</entry>
<entry>
  <ent_seq>2592670</ent_seq>
  <k_ele>
  <keb>友会</keb>
  </k_ele>
  <r_ele>
  <reb>ゆうかい</reb>
  </r_ele>
  <sense>
  <pos>&suf;</pos>
  <gloss>association</gloss>
  <gloss>club</gloss>
  <gloss>friends of ...</gloss>
  </sense>
</entry>
</JMdict>
"#;

const JMNEDICT_XML: &'static str = r#"<?xml version="1.0"?>
<!-- JMnedict created: 2024-08-29 -->
<JMnedict>
<entry>
  <ent_seq>5000268</ent_seq>
  <k_ele>
  <keb>あく屋</keb>
  </k_ele>
  <r_ele>
  <reb>あくや</reb>
  </r_ele>
  <trans>
  <name_type>&place;</name_type>
  <trans_det>Akuya</trans_det>
  </trans>
  </entry>
  <entry>
  <ent_seq>5538229</ent_seq>
  <k_ele>
  <keb>鏑木</keb>
  </k_ele>
  <r_ele>
  <reb>かぶらき</reb>
  </r_ele>
  <trans>
  <name_type>&place;</name_type>
  <name_type>&surname;</name_type>
  <trans_det>Kaburaki</trans_det>
  </trans>
</entry>
<entry>
  <ent_seq>5538230</ent_seq>
  <k_ele>
  <keb>鏑木</keb>
  </k_ele>
  <r_ele>
  <reb>かぶらぎ</reb>
  </r_ele>
  <trans>
  <name_type>&surname;</name_type>
  <trans_det>Kaburagi</trans_det>
  </trans>
</entry>
<entry>
  <ent_seq>5538231</ent_seq>
  <k_ele>
  <keb>鏑木</keb>
  </k_ele>
  <r_ele>
  <reb>かぶらやき</reb>
  </r_ele>
  <trans>
  <name_type>&surname;</name_type>
  <trans_det>Kaburayaki</trans_det>
  </trans>
</entry>
<entry>
  <ent_seq>5057716</ent_seq>
  <r_ele>
  <reb>ナウシカア</reb>
  <re_pri>spec1</re_pri>
  </r_ele>
  <r_ele>
  <reb>ナウシカー</reb>
  </r_ele>
  <trans>
  <name_type>&fem;</name_type>
  <trans_det>Nausicaa</trans_det>
  </trans>
  <trans>
  <name_type>&char;</name_type>
  <trans_det>Nausicaa (in Homer's Odyssey)</trans_det>
  </trans>
</entry>
</JMnedict>
"#;

fn create_dictionary() -> Result<Dictionary<Vec<u8>>> {
    let writer = DictionaryWriter::new();
    let writer = writer.read_jmdict(JMDICT_XML.as_bytes())?;
    let writer = writer.read_jmnedict(JMNEDICT_XML.as_bytes())?;
    let mut bytes: Vec<u8> = Vec::with_capacity(32 * 1024);
    writer.write(&mut bytes)?;
    let dict = Dictionary::try_decode(bytes)?;
    Ok(dict)
}

#[test]
fn test_search_word_term_index() -> Result<()> {
    let dict = create_dictionary()?;
    let term_index = &dict.borrow_view().term_index;
    let idxs = term_index.get("いじり回す")?;
    assert_eq!(idxs.len(), 1);
    let entries = dict.borrow_view().get_entries(&idxs)?;
    assert_eq!(entries.len(), 1);
    let entry = &entries[0];
    assert!(matches!(entry, Entry::Word(_)));
    match entry {
        Entry::Word(entry) => {
            assert_eq!(entry.id, 1000810)
        }
        _ => panic!(),
    }

    Ok(())
}

#[test]
fn test_search_name_term_index() -> Result<()> {
    let dict = create_dictionary()?;
    let term_index = &dict.borrow_view().term_index;
    let idxs = term_index.get("鏑木").unwrap();
    assert_eq!(idxs.len(), 1);
    let entries = dict.borrow_view().get_entries(&idxs)?;
    assert_eq!(entries.len(), 1);
    let entry = &entries[0];
    assert!(matches!(entry, Entry::Name(_)));
    match entry {
        Entry::Name(entry) => {
            assert_eq!(entry.kanji, "鏑木");
        }
        _ => panic!(),
    }

    Ok(())
}
