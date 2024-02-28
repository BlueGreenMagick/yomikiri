use std::fs::File;

use yomikiri_rs::SharedBackend;

use crate::common::setup_backend;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

fn test_grammar(
    backend: &mut SharedBackend<File>,
    sentence_inp: &'static str,
    includes: &[(&str, &str)],
    excludes: &[(&str, &str)],
    check_exist: bool,
) -> Result<()> {
    let char_at = sentence_inp.chars().position(|c| c == '＿').unwrap_or(0);
    let sentence = sentence_inp.replace('＿', "");
    let result = backend.tokenize(&sentence, char_at)?;

    let grammars: Vec<(String, String)> = result
        .grammars
        .iter()
        .map(|g| (g.name.to_string(), g.short.to_string()))
        .collect();

    let additional_panic_msg = if !sentence_inp.contains('＿') {
        "\n'＿' char was not found in sentence. Maybe that's the issue?"
    } else {
        ""
    };

    for (name, short) in includes {
        let exists = grammars
            .iter()
            .any(|(n, s)| n == name && (*short == "" || s == short));
        if !exists {
            panic!(
                "Testing sentence: {}\nCould not find grammar ({}, {}) in {:?}{}",
                sentence_inp, name, short, grammars, additional_panic_msg
            );
        }
    }

    for (name, short) in excludes {
        let exists = grammars
            .iter()
            .any(|(n, s)| n == name && (*short == "" || s == short));
        if exists {
            panic!(
                "Testing sentence: {}\nFound grammar ({}, {}) in {:?}{}",
                sentence_inp, name, short, grammars, additional_panic_msg
            );
        }
    }

    Ok(())
}

macro_rules! default_if_empty {
    ($default: expr,) => {
        $default
    };

    ($default: expr, $value: expr) => {
        $value
    };
}

/// ## Syntax:
///
/// Each test function mainly tests for a single grammar rule
/// You can specify `name` only,
/// or both name and short using syntax `name=short` for rules with identical names.
///
/// The test function name is followed by lines starting with `|`,
/// which tests for the existance of the main rule.
/// Then follows lines starting with `*`, which tests for exclusion of the main rule.
///
/// The lines contain the testing sentence. Char '＿' is put before The character to test token at.
///
/// Lines may also optionally contain more grammar rules to test.
/// `+ name short?` tests for the inclusion of the rule,
/// `- name short?` tests for the exclusion of the rule.
macro_rules! test {
    (
      $(
        $test:ident: $name:literal $(=$short:literal)?
        $(| $sentence:literal $(+$include_name:literal $(=$include_short:literal)?)* $(-$exclude_name:literal $(=$exclude_short:literal)?)* )*
        $(* $nsentence:literal $(+$ninclude_name:literal  $(=$ninclude_short:literal)?)* $(-$nexclude_name:literal $(=$nexclude_short:literal)?)* )*
      )+
    ) => {
      $(
        #[test]
        fn $test() -> Result<()> {
          let mut backend = setup_backend();
          let short = default_if_empty!("", $($short)?);
          $(
            let includes = vec![ ($name, short), $( ($include_name, default_if_empty!("", $($include_short)?)) ),*];
            let excludes = vec![$( ($exclude_name, default_if_empty!("", $($exclude_short)?)) ),*];
            test_grammar(&mut backend, $sentence, &includes, &excludes, true)?;
          )*
          $(
            let includes = vec![$( ($ninclude_name, default_if_empty!("", $($ninclude_short)?)) ),*];
            let excludes = vec![($name, short), $( ($nexclude_name, default_if_empty!("", $($nexclude_short)?)) ),*];
            test_grammar(&mut backend, $nsentence, &includes, &excludes, false)?;
          )*
          Ok(())
        }
      )+
    };
}

test!(
  // # Adjective Forms

  さ: "ーさ"
    | "便利さ"
    | "カバンの＿重さを測りました。"

  adjそう: "ーそう"="speculative adjective"
    | "便利＿じゃなさそう"
    | "美味しそうじゃない"
    | "狭そう"
    // verbそう
    * "泣き＿そう。"
    * "雨が降り＿そうです。"

  // # Verb Forms

  command: "ーえ／ーろ"
    | "ちゃんと黒板＿見ろ！"
    | "やめろよ"
    | "やめろってば"
    | "全力で＿やれ"
    | "ここに＿来い"

  plain: "ーる"
    | "パスタを＿食べる"
    | "パーティーを＿する。"
    | "＿飲む？"

  verbそう: "ーそう"="looks like ... will happen"
    | "今にも雨が降り＿そうです。"
    | "泣き＿そう。"
    | "雨が降り＿そうです。"
    // adjそう
    * "便利＿じゃなさそう"
    * "狭そう"

  causative: "ーせる／ーさせる"
    | "＿食べさせてください。"
    | "お先に＿帰らせていただきます"
    | "私は娘によりを＿させた"
    | "母は弟を学校に＿行かせた"
    | "母は弟を学校に＿行かせなかった"
    | "宝くじが当たったら、ハワイに＿行かせてやるよ。"
    | "毎日、母に納豆を＿食べさせられます。"

  た: "ーた"
    | "本を＿買った。"
    | "日本語が上手に＿なったね。"
    | "フグを＿食べましたか。"
    | "彼が＿死んだ。"
    | "泳いだ。"
    * "本が＿なかった" +"ーなかった"
    * "本が＿ありませんでした" +"ーませんでした"

  たい: "ーたい"
    | "トイレに＿行きたい。"
    | "木村さんは喧嘩＿したいらしい"

  たら: "ーたら"
    | "ご飯＿食べたらする。"
    | "雨＿じゃなかったら出かけたのに。"
    | "コウイチ＿だったら、外にいますよ。"
    | "問題が＿難しかったら、聞いてください。"
    | "このプリン＿食べたら？"

  たり: "ーたり"
    | "公園で自転車に乗っ＿たりバレーボールしたりした。"
    | "この辺は暑かっ＿たり寒かったりします。"
    | "お昼ごはんはサラダだっ＿たりおにぎりだったりする。"

  たがる: "ーたがる"
    | "食べたがる"
    | "木村さんは＿食べたがっている。"
    | "木村さんは＿走りたがらない。"

  てある: "ーてある"
    | "ドアが開けて＿ある。"
    | "メモはデスクに置いて＿ある。"
    | "あれ、雪かきして＿あった。"
    | "場所は既におさえて＿あります。"
    | "部屋は掃除がして＿ない"
    | "帰って＿なかったので、心配しました。"
    // | "茶を注いで＿ある。"
    | "だから、助っ人を呼んで＿ある"
    * "私達が会えたのは運命で＿あります。"

  ていく: "ーていく"
    | "ガチョウの 群れが飛んで＿行った。"
    | "書き出して＿いく"
    | "静かになって＿いく"

  てくる: "ーてくる"
    | "ガチョウの群れが飛んで＿来た。"
    | "ここまでは軽いストレッチをして＿きました。"
    | "見えて＿くる"
    | "うれしくなって＿くる"

  ている: "ーている"
    | "昼ごはんを食べて＿いる"
    | "テレビがついて＿いる。"
    | "知って＿いる。"
    | "去年から日本語を勉強して＿いない。"
    | "遊んで＿いませんでした。"

  られる: "ーられる"
    | "私は蜂に＿刺された。"
    | "タバコを＿吸われた。"
    | "このお酒は芋から＿作られている"
    | "私が＿閉ざされた"
    | "彼は＿刺されませんでした"

  ておく: "ーておく"
    | "日本語を勉強して＿おく"
    | "今のうちに、勉強して＿おこう。"
    | "予約して＿おいてくれないかな？"
    | "言って＿おかなければならないことがある。"

  てほしい: "ーてほしい"
    | "彼をかけて＿ほしい"
    | "早く終わって＿ほしい。"
    | "もっと早く教えて＿ほしかったよー。"
    | "これを言わないで＿ほしかった。"

  ない: "ーない"
    | "出来ない"
    | "泳げ＿ない"
    | "分からない"

  ません: "ーません"
    | "行きません"

  なかった: "ーなかった"
    | "食べなかった" -"ーない" -"ーた"
    | "僕は気持ち悪くて食べられ＿なかった。" -"ーない" -"ーた"
    | "見る価値が＿なかった！" -"ーない" -"ーた"

  ませんでした: "ーませんでした"
    | "食べませんでした" -"ーません" -"ーた"

  // # Particles

  ので: "ので"
    | "お腹が空いた＿のでレストランに行きました。" -"の" -"で"
    | "二十歳な＿のでお酒が飲めます。" -"の" -"で"
    | "彼女は忙しい＿んで、会えません" -"の" -"で"

  のに: "のに"
    | "クーラーをつけた＿のに、全然涼しくならなかった。" -"の" -"に"
    | "レモン＿なのに甘い" -"の" -"に"
    | "彼は忙しい＿んに、手伝ってくれない" -"の" -"に"
    * "ミルクは私＿のに入れないでね。" +"の" +"に"

  が: "ーが"="contrast (but)"
    | "ワインは好きです＿が、ビアは好きないです。"
    | "夏です＿が今日は涼しいです。"

  けれど: "ーけど／ーけれど"
    | "夏だ＿けど今日は涼しい。"
    | "ペン持ってないんだ＿けど、貸してくれない？"
    | "分からない＿けれど、一つだけ分かっていることがある。"
    | "もしもし。予約したいんです＿けど…。"

  か: "ーか"
    | "そうか"
    | "誰＿かがいると思う。"
    | "カレー＿かパスタかを作ると思う"

  から: "ーから"
    | "どこ＿から来たんですか。"
    | "学生＿から社会人になる。"
    | "予定がある＿から遊べない。"

  subjectが: "が"="subject"
    | "あの犬＿が吠えた。"
    | "私＿が社長です。"
    | "梅干＿が大好き。"
    | "日本語＿が分かる。"

  で: "で"
    | "バス＿で行きます"
    | "インスタ＿で"
    | "この小説は五つの章＿で構成されている"
    // aux verbs
    // unidic often mistakes aux で(だ) as particle で...
    // - "外国人＿で日本に居る人"
    * "人間＿である"

  と: "と"="together; quote"
    | "トマト＿とバナナを食べる。"
    | "妹＿とトマトを食べた。"
    | "紅茶＿とコーヒー、どれがいいですか？"
    | "彼女＿とキスをした。"
    | "キャメロンが「おはよう」＿と言った。"
    * "ご飯を食べる＿と眠くなる。"  +"と"="causal relationship"
    * "ボタンを押す＿と、店員が来た。"  +"と"="causal relationship"

  causalと: "と"="causal relationship"
    | "ご飯を食べる＿と眠くなる。"
    | "晴れる＿とよくランニングをする。"
    | "ボタンを押す＿と、店員が来た。"
    | "このボタンを押す＿とどうなりますか？"
    | "はっきり言う＿と…"
    * "トマト＿とバナナを食べる。"  +"と"="together; quote"
    * "妹＿とトマトを食べた。"  +"と"="together; quote"

  に: "に"
    | "火星＿にいる。"
    | "彼は宇宙人を探し＿に行きました。"
    | "宇宙はとても静か＿になった。"
    | "まみは子供＿に外で遊ばせた。"
    | "あっ、ミルクは私の＿に入れないでね。"
    | "おいしそう＿に食べる"

  ね: "ね"
    | "あ、雨が降ってる＿ね。"
    | "できない＿ね。"

  nounの: "ーの"="noun form; explanatory"
    | "走る＿のは楽しい。"
    | "こんな＿の要らないよ。"
    // | "授業中は、おしゃべりしない＿の！"
    | "何をしている＿の"
    * "私＿の車" +"の"="possessive; apposition"
    * "フルーツ＿のバナナ" +"の"="possessive; apposition"

  の: "の"="possessive; apposition"
    | "私＿の車"
    | "アメリカへ＿の飛行機"
    | "フルーツ＿のバナナ"
    * "走る＿のは楽しい。" +"ーの"="noun form; explanatory"
    * "こんな＿の要らないよ。" +"ーの"="noun form; explanatory"

  は: "は"
    | "これ＿は何ですか。"
    | "難しく＿はない。"

  へ: "へ"
    | "アメリア＿へ行く"
    | "娘＿へ荷物を送った。"
    | "どうぞ、こちら＿へ"
    | "花子＿への手紙"

  まで: "まで"
    | "家から学校＿まで"
    | "これ食べる＿まで待って"
    | "１０時＿までに帰る。"
    | "納豆＿まで食べれるの！？"

  も: "も"
    | "私＿も日本語を教えています。"
    | "私は学生で＿もあります。"
    | "ジェニーに＿もあげる。"
    | "５キロ＿も太った。"
    | "どれ＿もおいしそう！"

  や: "や"
    | "トマト＿やバナナやストロベリーです。"

  よ: "よ"
    | "食べる＿よ"
    * "食べる＿よね。"

  よね: "よね"
    | "食べる＿よね。" - "よ"

  より: "より"
    | "トムは、ベン＿より背が高い。"
    | "私が作る方がトムが作る＿よりおいしい。"
    | "ここ＿より先、立入禁止。"

  わ: "わ"
    | "落ちたと思う＿わ。"
    | "静かじゃない＿わ"
    | "猫だった＿わ。"

  を: "を"
    | "キャメロンがゴキブリ＿をつぶした。"
    | "マミが家＿を出た。"

  // # Prefix

  お: "おー"
    | "お預かりする"
    | "お茶"
    | "ご注文"
    | "御国"

  // # Pronoun

  pronoun1: "私／僕／俺／うち"
    | "＿私は学生です"
    | "それ、＿僕の本かな？"
    | "＿俺と飯食いに行かない？"
    | "＿うちらの先生、めっちゃうざいよね。"
    | "＿私たちは学生です。"

  pronoun2: "あなた／君／お前"
    | "＿あなたの車、高く買い取ります！"
    | "＿君の名は"
    | "＿お前、ふざけてんのか？"
    | "＿貴様、止めろ"

  pronoun3: "彼／彼女／こいつ／そいつ／あいつ"
    | "＿彼が好きです。"
    | "＿彼女は学生だ。"
    | "何を言っているんだ、＿こいつは。"
    | "＿そいつが来た。"
    | "＿あいつは何を考えているんだ。"
);
