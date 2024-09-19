use itertools::Itertools;
use yomikiri_dictionary::dictionary::{DictionaryView, DictionaryWriter};
use yomikiri_dictionary::entry::NameEntry;
use yomikiri_dictionary::WordEntry;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

fn parse_jmdicts(
    jmdict: Option<&str>,
    jmnedict: Option<&str>,
) -> Result<(Vec<WordEntry>, Vec<NameEntry>)> {
    let writer = DictionaryWriter::new();
    let jmdict = jmdict.unwrap_or("<JMdict></JMdict>");
    let jmnedict = jmnedict.unwrap_or("<JMnedict></JMnedict>");

    let writer = writer.read_jmdict(jmdict.as_bytes())?;
    let writer = writer.read_jmnedict(jmnedict.as_bytes())?;
    let mut bytes = Vec::with_capacity(128);
    writer.write(&mut bytes)?;

    let (dict, _) = DictionaryView::try_decode(&bytes)?;
    let mut word_entries: Vec<WordEntry> = dict.entries.all_items_iter().try_collect()?;
    let mut name_entries: Vec<NameEntry> = dict.name_entries.all_items_iter().try_collect()?;
    word_entries.sort_by(|a, b| a.id.cmp(&b.id));
    name_entries.sort_by(|a, b| a.kanji.cmp(&b.kanji));

    Ok((word_entries, name_entries))
}

#[test]
fn test_jmdict_parse_1() -> Result<()> {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
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
</JMdict>
"#;
    let result = parse_jmdicts(Some(xml), None)?;
    insta::assert_yaml_snapshot!(result);
    Ok(())
}

#[test]
fn test_jmdict_parse_2() -> Result<()> {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<!-- JMdict created: 2024-08-23 -->
<JMdict>
<entry>
<ent_seq>1006950</ent_seq>
<k_ele>
<keb>抑</keb>
<ke_inf>&rK;</ke_inf>
</k_ele>
<k_ele>
<keb>抑々</keb>
<ke_inf>&rK;</ke_inf>
</k_ele>
<k_ele>
<keb>抑抑</keb>
<ke_inf>&rK;</ke_inf>
</k_ele>
<k_ele>
<keb>抑も</keb>
<ke_inf>&io;</ke_inf>
<ke_inf>&rK;</ke_inf>
</k_ele>
<r_ele>
<reb>そもそも</reb>
</r_ele>
<sense>
<pos>&n;</pos>
<pos>&adv;</pos>
<misc>&uk;</misc>
<gloss>in the first place</gloss>
</sense>
<sense>
<pos>&conj;</pos>
<misc>&uk;</misc>
<s_inf>used when bringing up something already mentioned</s_inf>
<gloss>after all</gloss>
<gloss>anyway</gloss>
</sense>
<sense>
<pos>&n;</pos>
<pos>&adj-no;</pos>
<misc>&uk;</misc>
<gloss>beginning</gloss>
<gloss>start</gloss>
</sense>
</entry>
</JMdict>
"#;

    let result = parse_jmdicts(Some(xml), None)?;
    insta::assert_yaml_snapshot!(result);
    Ok(())
}

#[test]
fn skip_name_entries_in_jmdict() -> Result<()> {
    let xml = r#"<?xml version="1.0"?>
<!-- JMnedict created: 2024-08-29 -->
<JMdict>
<entry>
<ent_seq>2862076</ent_seq>
<k_ele>
<keb>自己査定</keb>
</k_ele>
<r_ele>
<reb>じこさてい</reb>
</r_ele>
<sense>
<pos>&n;</pos>
<gloss>self-assessment</gloss>
<gloss>self-evaluation</gloss>
<gloss>self-appraisal</gloss>
<gloss>self-audit</gloss>
</sense>
</entry>
<entry>
<ent_seq>5000058</ent_seq>
<k_ele>
<keb>ＰＣエンジン</keb>
</k_ele>
<r_ele>
<reb>ピーシーエンジン</reb>
</r_ele>
<sense>
<pos>&n;</pos>
<misc>&product;</misc>
<gloss>(NEC) PC Engine</gloss>
<gloss>TurboGrafx-16</gloss>
</sense>
</entry>
</JMdict>
"#;
    let result = parse_jmdicts(Some(xml), None)?;
    insta::assert_yaml_snapshot!(result);
    Ok(())
}

#[test]
fn test_jmnedict_parse_single() -> Result<()> {
    let xml = r#"<?xml version="1.0"?>
<!-- JMnedict created: 2024-08-29 -->
<JMnedict>
<entry>
<ent_seq>5073921</ent_seq>
<k_ele>
<keb>恵山</keb>
</k_ele>
<r_ele>
<reb>ヘサン</reb>
</r_ele>
<r_ele>
<reb>けいざん</reb>
</r_ele>
<trans>
<name_type>&place;</name_type>
<trans_det>Hyesan (North Korea)</trans_det>
</trans>
</entry>
</JMnedict>
"#;
    let result = parse_jmdicts(None, Some(xml))?;
    insta::assert_yaml_snapshot!(result);
    Ok(())
}

// multiple jmne entries are merged into one name entry
// and also creates a word entry
#[test]
fn test_jmnedict_parse_multiple() -> Result<()> {
    let xml = r#"<?xml version="1.0"?>
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
</JMnedict>
"#;

    let result = parse_jmdicts(None, Some(xml))?;
    insta::assert_yaml_snapshot!(result);

    Ok(())
}
