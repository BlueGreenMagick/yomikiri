use yomikiri_dictionary::jmdict::parse_jmdict_xml;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

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
    let entries = parse_jmdict_xml(&xml)?;
    insta::assert_yaml_snapshot!(entries);
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
    let entries = parse_jmdict_xml(&xml)?;
    insta::assert_yaml_snapshot!(entries);
    Ok(())
}
