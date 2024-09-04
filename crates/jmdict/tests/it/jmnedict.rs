use insta::assert_yaml_snapshot;
use yomikiri_jmdict::jmnedict::parse_jmnedict_xml;
use yomikiri_jmdict::Result;

#[test]
fn test_parse_jmnedict() -> Result<()> {
    let xml = r#"<?xml version="1.0"?>
<!DOCTYPE JMnedict [
    <!ELEMENT JMnedict (entry*)>
<!ENTITY char "character">
<!ENTITY company "company name">
]>
<!-- JMnedict created: 2024-08-29 -->
<JMnedict>
<entry>
<ent_seq>5000000</ent_seq>
<k_ele>
<keb>ゝ泉</keb>
</k_ele>
<r_ele>
<reb>ちゅせん</reb>
</r_ele>
<trans>
<name_type>&given;</name_type>
<trans_det>Chusen</trans_det>
</trans>
</entry>
<entry>
<ent_seq>5000001</ent_seq>
<k_ele>
<keb>〆</keb>
</k_ele>
<r_ele>
<reb>しめ</reb>
</r_ele>
<trans>
<name_type>&fem;</name_type>
<trans_det>Shime</trans_det>
</trans>
</entry>
<entry>
<ent_seq>5744957</ent_seq>
<k_ele>
<keb>全日本労働総同盟</keb>
</k_ele>
<r_ele>
<reb>ぜんにほんろうどうそうどうめい</reb>
<re_pri>spec1</re_pri>
</r_ele>
<trans>
<name_type>&organization;</name_type>
<trans_det>Japanese Confederation of Labor (1936-1939)</trans_det>
<trans_det>Zensō</trans_det>
</trans>
<trans>
<name_type>&organization;</name_type>
<trans_det>Japanese Confederation of Labor (1964-1987)</trans_det>
<trans_det>Dōmei</trans_det>
</trans>
</entry>
</JMnedict>"#;
    let result = parse_jmnedict_xml(&xml)?;
    assert_yaml_snapshot!(result);
    Ok(())
}
