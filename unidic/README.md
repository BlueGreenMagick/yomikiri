`/original` is UniDic 2.2.0 downloaded from [here](https://clrd.ninjal.ac.jp/unidic_archive/cwj/2.2.0/).

`build-dictionary` builds the output data from `/original` files, 
that gets included into `yomikiri-unidic-dictionary` as static data.

## Lex Data

### Fields
source: https://github.com/polm/unidic-py

0.  surface
1.  Left id
2.  Right id
3.  Cost
4.  part-of-speech 1
5.  part-of-speech 2
6.  part-of-speech 3
7.  part-of-speech 4
8.  conjugation type (活用型)
9.  conjugation form (活用形)
10. lemma reading (語彙素読み)
11. lemma (語彙素（語彙素表記 + 語彙素細分類）)
12. orth (書字形出現形)
13. pron (発音形出現形)
14. orthBase (書字形基本形)
15. pronBase (発音形基本形)
...
24. kana (読みがな) katakana representation of word. Without 'ー'
25. kanaBase (仮名形基本形) katakana representation of lemma
26. form (語形出現形)
27. formBase (語形基本形) uninflected form of word


### All possible POS
All possible POS in unidic v2.2.0 (extracted from lex_naist.csv)

```
- 名詞 (noun)
  - 助動詞語幹
  - 固有名詞
    - 地名
      - 一般
      - 国
    - 人名
      - 一般
      - 名
      - 姓
    - 一般
  - 普通名詞
    - 形状詞可能
    - サ変可能
    - 一般
    - 助数詞可能
    - サ変形状詞可能
    - 副詞可能
  - 数詞
- 助詞 (particle)
  - 係助詞
  - 格助詞
  - 接続助詞 (conjunctive particle)
  - 準体助詞
  - 終助詞
  - 副助詞
- 動詞 (verb)
  - 一般
  - 非自立可能
- 形容詞 (adjective)
  - 非自立可能
  - 一般
- 形状詞 (na-adjective)
  - 助動詞語幹
  - 一般
  - タリ
- 感動詞 (exclamation / interjection)
  - 一般
  - フィラー
- 接尾辞 (suffix)
  - 名詞的
    - 副詞可能
    - サ変可能
    - 一般
    - 助数詞
  - 形容詞的
  - 動詞的
  - 形状詞的
- 助動詞 (auxilliary verb)
- 空白 (whitespace)
- 代名詞 (pronoun)
- 記号 (symbol)
  - 一般
  - 文字
- 補助記号 (supplemantary symbol)
  - 読点
  - 一般
  - 括弧開
  - 括弧閉
  - ＡＡ
    - 顔文字
    - 一般
  - 句点
- 接続詞 (conjunction, しかし)
- 接頭辞 (prefix, お-, 真っ-)
- 連体詞 (pre-noun adjectival, この)
- 副詞 (adverb)
```