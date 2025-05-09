use std::collections::HashMap;

use yomikiri_rs::grammar::GRAMMARS;

use crate::common::BACKEND;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

fn test_rule_exists(rules: &[(&str, &str)]) {
    let mut names: HashMap<&'static str, Vec<&'static str>> = HashMap::new();

    for grammar in GRAMMARS {
        names
            .entry(grammar.name)
            .and_modify(|v| v.push(grammar.short))
            .or_insert(vec![grammar.short]);
    }

    for (name, short) in rules {
        if let Some(rule_shorts) = names.get(name) {
            if short.is_empty() {
                if rule_shorts.len() != 1 {
                    panic!("Multiple grammar rule found for name '{}'.\nYou must specify the short as well, with syntax '\"(name)\"=\"(short)\"'.", name);
                }
            } else if !rule_shorts.contains(short) {
                panic!("No grammar rule (name, short) found: ({}, {})", name, short);
            }
        } else {
            panic!("No grammar rule with name {}", name);
        }
    }
}

fn test_grammar(
    sentence_inp: &'static str,
    includes: &[(&str, &str)],
    excludes: &[(&str, &str)],
) -> Result<()> {
    test_rule_exists(includes);
    test_rule_exists(excludes);

    let char_at = sentence_inp.chars().position(|c| c == '＿').unwrap_or(0);
    let sentence = sentence_inp.replace('＿', "");
    let result = BACKEND.tokenize(&sentence, char_at)?;

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
        $test:ident: $($name:literal $(=$short:literal)?)?
        $(| $sentence:literal $(+$include_name:literal $(=$include_short:literal)?)* $(-$exclude_name:literal $(=$exclude_short:literal)?)* )*
        $(* $nsentence:literal $(+$ninclude_name:literal  $(=$ninclude_short:literal)?)* $(-$nexclude_name:literal $(=$nexclude_short:literal)?)* )*
      )+
    ) => {
      $(
        #[test]
        fn $test() -> Result<()> {
          let mut main = vec![];
          $(
            main.push(($name, default_if_empty!("", $($short)?)));
          )?

          $(
            let mut includes = main.clone();
            $(
              includes.push(($include_name, default_if_empty!("", $($include_short)?)));
            )*
            let excludes = vec![$( ($exclude_name, default_if_empty!("", $($exclude_short)?)) ),*];
            test_grammar($sentence, &includes, &excludes)?;
          )*
          $(
            let includes = vec![$( ($ninclude_name, default_if_empty!("", $($ninclude_short)?)) ),*];
            let mut excludes = main.clone();
            $(
              excludes.push(($nexclude_name, default_if_empty!("", $($nexclude_short)?)));
            )*
            test_grammar($nsentence, &includes, &excludes)?;
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

  がる: "ーがる"
    | "彼は羨まし＿がっている。"
    | "私がお菓子を＿ほしがると、姉はいつもわけてくれる。"
    | "怖＿がらなくても大丈夫です。"
    | "不安＿がっているのだろうか"

  ければ: "ーければ"
    | "おいし＿ければ、売れるでしょう。" -"ーば"
    | "天気がよ＿ければよく外を走ったものだ。"
    | "天気が悪＿ければ、遠足は中止になる。"

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

  verbながら: "ーながら"="while"
    | "食べ＿ながら遊ぶ"
    | "今度、話しましょう。食べ＿ながら。"
    // 'though'
    * "貧しい＿ながらも幸せに暮らしている"
    * "我＿ながらあきれる"

  なさい: "ーなさい"
    | "やめなさい"
    | "たくさん食べ＿なさい。"

  にくい: "ーにくい"
    | "歩き＿にくい靴"
    | "私の姉は車酔いし＿にくい。"
    | "歩き＿にくい靴"

  ば: "ーば"
    | "時間があれ＿ば、クッキーを作るよ。"
    | "３に２をかけれ＿ば、６になる。"
    | "お金があれ＿ば、何でもできる。"
    | "この緑色の薬を飲め＿ば、治りますか。"
    * "終わりよけれ＿ば全てよし。" +"ーければ"

  やすい: "ーやすい"
    | "ジェニーは話し＿やすい。"
    | "私の父は酔い＿やすい。"
    | "話し＿やすい人"

  よう: "ー(よ)う"
    | "行こう"
    | "私がカレーを＿作ろう。"
    // | "やっぱり動物園に行くのは＿よそう。"
    | "続きを＿読みましょう"
    // can be used with 形容詞
    | "＿安かろう悪かろうということだ。"

  godanられる: "ー（ら）れる"
    | "私は蜂に＿刺された。" -"ーられる"
    | "タバコを＿吸われた。" -"ーられる"
    | "私が＿閉ざされた" -"ーられる"
    | "このお酒は芋から＿作られている" -"ーられる"
    | "彼は＿刺されませんでした" -"ーられる"

  ichidanられる: "ーられる"
    | "この消しゴムは＿食べられる。" -"ー（ら）れる"
    | "食べられませんでした" -"ー（ら）れる"
    | "考えられない" -"ー（ら）れる"

  // # Particles

  ので: "ので"
    | "お腹が空いた＿のでレストランに行きました。" -"の" -"で"
    | "二十歳な＿のでお酒が飲めます。" -"の" -"で"
    | "彼女は忙しい＿んで、会えません" -"の" -"で"

  のに: "のに"
    | "クーラーをつけた＿のに、全然涼しくならなかった。" -"の" -"に"
    | "レモン＿なのに甘い" -"の" -"に"
    * "ミルクは私＿のに入れないでね。" +"の" +"に"

  が: "ーが"="contrast (but)"
    | "ワインは好きです＿が、ビアは好きないです。"
    | "夏です＿が今日は涼しいです。"

  けど: "ーけど"
    | "夏だ＿けど今日は涼しい。" -"ーけれど"
    | "ペン持ってないんだ＿けど、貸してくれない？" -"ーけれど"
    | "もしもし。予約したいんです＿けど…。" -"ーけれど"

  けれど: "ーけれど"
    | "分からない＿けれど、一つだけ分かっていることがある。" -"ーけど"
    | "難しい＿けれど、可能性がある" -"ーけど"

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
    | "インスタ＿で！"
    | "この小説は五つの章＿で構成されている"
    * "学生＿ではない" +"ーではない"
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
    * "学生で＿はない" +"ーではない"

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

  し: "ーし"
    | "暗い＿し、危ない。"
    | "ここはもう暗くない＿し、危なくない。"
    | "彼は有名だ＿しかっこいい"

  な: "ーな"
    | "動く＿な！"
    | "来る＿な！"
    // | "食べ＿んな！"
    | "来ん＿な！"
    | "乾燥に負ける＿な！"

  くらい: "くらい"
    | "５０個＿くらい。"
    | "４時間＿くらい。"
    | "半分＿くらい。"
    | "同じ＿くらい。"
    | "この＿くらい入れてください。"
    | "どの＿くらいかかりますかね。"
    | "いつ＿ぐらいに帰れますかね。"
    | "パンケーキ＿くらいなら作れるよ。"

  だけ: "ーだけ"
    | "最近は、漢字＿だけ勉強している。"
    | "サウナなんて、暑い＿だけじゃん。"
    | "行く＿だけだよ？"
    | "親が有名だった＿だけ。"
    | "これ＿だけは聞いて！"

  なら: "ーなら"
    | "寒い＿ならこれを着てください。"
    | "外に行く＿なら、ゴミ捨てて来て。"
    | "その帽子＿なら、さっき誰かが持って行きましたよ"

  // # Clause Link
  contrastながら: "ーながら"="contrast (although)"
    | "小さい＿ながら甘いいちご。"
    | "彼は初心者＿ながらよくやった。"
    | "誠に勝手＿ながら、欠席いたします。"
    | "美しい＿ながら失敗しました。"
    // exclude verbながら
    * "彼はモテないと＿言いながら、いつも彼女がいる。"

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

  // # Plain, Negative, Past
  ます: "ーます"
    | "飲み＿ます。"
    | "続きを＿読みましょう"
    * "合格し＿ました。" +"ーました"
    * "見え＿ません。" +"ーません"
    * "歌え＿ませんでした。" +"ーませんでした"

  だ: "ーだ"
    | "私は学生＿だ"
    | "ここは静か＿だ"
    | "このは便利＿だ"

  です: "ーです"
    | "私は学生＿です。"
    | "ここは＿静かです。"
    | "ここは高い＿です。"
    * "明日は雨＿でしょう"
    * "私は学生＿でした" +"ーでした"

  ない: "ーない"
    | "出来ない"
    | "泳げない"
    | "分からない"
    * "高く＿ない" +"ーくない"
    * "学生じゃ＿ない" +"ーじゃない"
    * "学生では＿ない" +"ーではない"
    * "歌いません" +"ーません"
    * "歌わなかった" +"ーなかった"

  ません: "ーません"
    | "歌いません" -"ーます" -"ーない"
    | "読みません" -"ーます" -"ーない"
    * "歌い＿ませんでした。" +"ーませんでした"

  くない: "ーくない"
    | "難しく＿ない" -"ーない"

  じゃない: "ーじゃない"
    | "学生＿じゃない" -"ーない"
    | "静かじゃ＿ない" -"ーない"
    | "便利じゃ＿ない" -"ーない"

  ではない: "ーではない"
    | "学生では＿ない" -"で" -"は" -"ーない"
    // | "静かでは＿ない" -"で" -"は" -"ーない"
    | "便利では＿ない" -"で" -"は" -"ーない"

  た: "ーた"
    | "本を＿買った。"
    | "日本語が上手に＿なったね。"
    | "彼が＿死んだ。"
    | "泳いだ。"
    * "歌いまし＿た" + "ーました"
    * "学生＿でした" + "ーでした"
    * "本が＿なかった" +"ーなかった"
    * "本が＿ありませんでした" +"ーませんでした"

  ました: "ーました"
    | "歌いました"
    | "読みました"
    // could be 増す + "ーた"?
    * "数を＿ました" +"ーた"

  かった: "ーかった"
    | "難しかった" -"ーた"
    | "楽しかったです" -"ーた"
    | "美しかった女優" -"ーた"

  だった: "ーだった"
    | "学生＿だった" -"ーた"
    | "静かだった" -"ーた"
    | "便利＿だった" -"ーた"

  でした: "ーでした"
    | "私は学生＿でした" -"ーです" -"ーた"
    | "ここは静か＿でした" -"ーです" -"ーた"
    | "便利＿でした" -"ーです" -"ーた"

  ませんでした: "ーませんでした"
    | "食べませんでした" -"ーません" -"ーます" -"ーた"

  なかった: "ーなかった"
    | "食べなかった" -"ーない" -"ーた" -"ーかった"
    | "僕は気持ち悪くて食べられ＿なかった。" -"ーない" -"ーた" -"ーかった"
    | "見る価値が＿なかった！" -"ーない" -"ーた" -"ーかった"
    * "私は学生では＿なかったです" +"ーではなかった"

  じゃなかった: "ーじゃなかった"
    | "私は学生じゃ＿なかった" -"ーじゃない" -"ーなかった" -"ーない" -"ーかった" -"ーた"
    | "ここは静かじゃ＿なかった" -"ーじゃない" -"ーなかった" -"ーない" -"ーかった" -"ーた"
    | "このが便利じゃ＿なかった" -"ーじゃない" -"ーなかった" -"ーない" -"ーかった" -"ーた"

  ではなかった: "ーではなかった"
    | "私は学生では＿なかった" -"で" -"は" -"ーなかった" -"ーない" -"ーかった" -"ーた"
    // | "ここは静かでは＿なかった" -"で" -"は" -"ーなかった" -"ーない" -"ーかった" -"ーた"
    | "このが便利では＿なかった" -"で" -"は" -"ーなかった" -"ーない" -"ーかった" -"ーた"
);
