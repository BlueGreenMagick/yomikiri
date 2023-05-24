When bundling this library, `.wasm` file need to be loaded as file url.

If using esbuild, add `loader: { ".wasm": "file" }` to the build options.
See 'esbuild.config.js' file for more information.

Run `yarn dev` to test changes.

Run `yarn build:all` when rust code changes.

### All possible POS
All possible POS in ipadic

```
- 名詞
  - 接尾 (suffix)
    - 助動詞語幹
    - 副詞可能
    - 助数詞
    - 特殊
    - 形容動詞語幹
    - 人名
    - 一般
    - サ変接続
    - 地域
  - 固有名詞
    - 地域
    - 人名
    - 一般
    - 組織
  - 形容動詞語幹
  - 代名詞
    - 一般
    - 縮約
  - 数
  - 引用文字列
  - ナイ形容詞語幹
  - 非自立
    - 一般
    - 助動詞語幹
    - 副詞可能
    - 形容動詞語幹
  - 特殊
    - 助動詞語幹
  - 一般
  - 動詞非自立的
  - 副詞可能
  - 接続詞的
  - サ変接続
- 動詞 (verb)
  - 自立
  - 非自立
  - 接尾
- 記号
  - 読点
  - 括弧閉
  - 括弧開
  - アルファベット
  - 空白
  - 句点
  - 一般
- 感動詞
- 副詞
  - 一般
  - 助詞類接続
- 形容詞 (adjective)
  - 接尾
  - 自立
  - 非自立
- 接頭詞 (prefix, お-, 真っ-)
  - 数接続
  - 名詞接続
  - 形容詞接続
  - 動詞接続
- 助詞
  - 副助詞／並立助詞／終助詞
  - 格助詞
    - 連語
    - 引用
    - 一般
  - 接続助詞
  - 副助詞
  - 副詞化
  - 特殊
  - 係助詞
  - 並立助詞
  - 終助詞
  - 連体化
- 接続詞 (conjunction, しかし) 
- その他
  - 間投
- フィラー
- 助動詞
- 連体詞 (pre-noun adjectival, この)
```