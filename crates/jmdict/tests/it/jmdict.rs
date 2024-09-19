use insta::assert_yaml_snapshot;
use yomikiri_jmdict::{parse_jmdict_xml, Result};

#[test]
fn test_xml_parse() -> Result<()> {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<!-- some other comment -->
<!-- JMdict created: 2024-08-07 -->
<JMdict>
<entry>
<ent_seq>1000040</ent_seq>
<k_ele>
<keb>〃</keb>
</k_ele>
<r_ele>
<reb>おなじ</reb>
</r_ele>
<r_ele>
<reb>おなじく</reb>
</r_ele>
<sense>
<pos>&n;</pos>
<gloss>ditto mark</gloss>
</sense>
</entry>
<entry>
<ent_seq>1000050</ent_seq>
<k_ele>
<keb>仝</keb>
</k_ele>
<r_ele>
<reb>どうじょう</reb>
</r_ele>
<sense>
<pos>&n;</pos>
<gloss>"as above" mark</gloss>
</sense>
</entry>
<entry>
<ent_seq>9999999</ent_seq>
<k_ele>
<keb>ＪＭｄｉｃｔ</keb>
</k_ele>
<r_ele>
<reb>ジェイエムディクト</reb>
</r_ele>
<sense>
<pos>&unc;</pos>
<gloss>Japanese-Multilingual Dictionary Project - Creation Date: 2024-08-23</gloss>
</sense>
</entry>
</JMdict>
"#;
    let result = parse_jmdict_xml(xml.as_bytes())?;
    assert_yaml_snapshot!(result);
    Ok(())
}

#[test]
fn test_parse_dialect() -> Result<()> {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<JMdict>
<entry>
<ent_seq>1234567</ent_seq>
<k_ele>
<keb>言葉</keb>
</k_ele>
<r_ele>
<reb>ことば</reb>
</r_ele>
<sense>
<pos>&n;</pos>
<xref>次発</xref>
<dial>&bra;</dial>
<dial>&hob;</dial>
<dial>&ksb;</dial>
<dial>&ktb;</dial>
<dial>&kyb;</dial>
<dial>&kyu;</dial>
<dial>&nab;</dial>
<dial>&osb;</dial>
<dial>&rkb;</dial>
<dial>&thb;</dial>
<dial>&tsb;</dial>
<dial>&tsug;</dial>
<dial>unk</dial>
<gloss>some meaning</gloss>
</sense>
</entry>
<entry>
<ent_seq>9999999</ent_seq>
<k_ele>
<keb>ＪＭｄｉｃｔ</keb>
</k_ele>
<r_ele>
<reb>ジェイエムディクト</reb>
</r_ele>
<sense>
<pos>&unc;</pos>
<gloss>Japanese-Multilingual Dictionary Project - Creation Date: 2024-08-23</gloss>
</sense>
</entry>
</JMdict>
"#;
    let result = parse_jmdict_xml(xml.as_bytes())?;
    assert_yaml_snapshot!(result);
    Ok(())
}

#[test]
fn test_xml_parse2() -> Result<()> {
    let xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<!-- JMdict created: 2024-08-07 -->
<JMdict>
<entry>
<ent_seq>1580500</ent_seq>
<k_ele>
<keb>剰え</keb>
<ke_inf>&rK;</ke_inf>
</k_ele>
<k_ele>
<keb>剰</keb>
<ke_inf>&io;</ke_inf>
<ke_inf>&rK;</ke_inf>
</k_ele>
<r_ele>
<reb>あまつさえ</reb>
</r_ele>
<r_ele>
<reb>あまっさえ</reb>
</r_ele>
<sense>
<pos>&adv;</pos>
<misc>&uk;</misc>
<s_inf>usu. negative nuance</s_inf>
<gloss>besides</gloss>
<gloss>moreover</gloss>
<gloss>in addition</gloss>
</sense>
</entry>
<entry>
<ent_seq>9999999</ent_seq>
<k_ele>
<keb>ＪＭｄｉｃｔ</keb>
</k_ele>
<r_ele>
<reb>ジェイエムディクト</reb>
</r_ele>
<sense>
<pos>&unc;</pos>
<gloss>Japanese-Multilingual Dictionary Project - Creation Date: 2024-08-23</gloss>
</sense>
</entry>
</JMdict>
    "#;
    let result = parse_jmdict_xml(xml.as_bytes())?;
    assert_yaml_snapshot!(result);
    Ok(())
}
