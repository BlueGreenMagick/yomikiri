import { test, expect, describe } from "@jest/globals";
import { RubyString, toHiragana, toKatakana } from "./japanese";

describe("RubyString", () => {
  test("generate", () => {
    expect(RubyString.generate("", "")).toEqual([]);
    // no reading
    expect(RubyString.generate("한국어", "*")).toEqual([{ base: "한국어" }]);
    expect(RubyString.generate("한국어", "")).toEqual([{ base: "한국어" }]);

    // match position
    expect(RubyString.generate("あエ本w1。", "あえほんw1。")).toEqual([
      { base: "あエ" },
      { base: "本", ruby: "ほん" },
      { base: "w1。" },
    ]);
    expect(RubyString.generate("読み切り", "よみきり")).toEqual([
      { base: "読", ruby: "よ" },
      { base: "み" },
      { base: "切", ruby: "き" },
      { base: "り" },
    ]);
    expect(RubyString.generate("お客", "おきゃく")).toEqual([
      { base: "お" },
      { base: "客", ruby: "きゃく" },
    ]);
  });

  test("generate complex", () => {
    expect(
      RubyString.generate("配信の否認不能", "はいしんのひにんふのう")
    ).toEqual([
      { base: "配信", ruby: "はいしん" },
      { base: "の" },
      { base: "否認不能", ruby: "ひにんふのう" },
    ]);

    // TODO: furigana for joined-tokens may generate incorrectly
    /*
    expect(RubyString.generate("書式付き形式", "しょしきつきけいしき")).toEqual(
      [
        { base: "書式付", ruby: "しょしきつ" },
        { base: "き" },
        { base: "形式", ruby: "けいしき" },
      ]
    );
    */
  });

  test("generate katakana", () => {
    expect(RubyString.generate("ド真ん中", "どまんなか")).toEqual([
      { base: "ド" },
      { base: "真", ruby: "ま" },
      { base: "ん" },
      { base: "中", ruby: "なか" },
    ]);
    expect(RubyString.generate("ホーム", "ホーム")).toEqual([
      { base: "ホーム" },
    ]);
  });

  test("to Anki", () => {
    let rubies: RubyString;
    rubies = [{ base: "読", ruby: "よ" }, { base: "む" }];
    expect(RubyString.toAnki(rubies)).toEqual("読[よ]む");
    rubies = [
      { base: "本", ruby: "ほん" },
      { base: "屋", ruby: "や" },
    ];
    expect(RubyString.toAnki(rubies)).toEqual("本[ほん] 屋[や]");
  });

  test("to HTML", () => {
    let rubies: RubyString;
    rubies = [{ base: "読", ruby: "よ" }, { base: "む" }];
    expect(RubyString.toHtml(rubies)).toEqual("<ruby>読<rt>よ</rt></ruby>む");
    rubies = [
      { base: "本", ruby: "ほん" },
      { base: "<" },
      { base: "話", ruby: "<" },
    ];
    expect(RubyString.toHtml(rubies)).toEqual(
      "<ruby>本<rt>ほん</rt></ruby>&lt;<ruby>話<rt>&lt;</rt></ruby>"
    );
  });
});

describe("Japanese", () => {
  test("katakana to hiragana", () => {
    expect(toHiragana("私はハンバーグだ")).toBe("私ははんばーぐだ");
    expect(toHiragana("アルガポィ")).toBe("あるがぽぃ");
  });

  test("hiragana to katakana", () => {
    expect(toKatakana("コンソメを食べたい。")).toBe("コンソメヲ食ベタイ。");
    expect(toKatakana("あるがぽぃ")).toBe("アルガポィ");
  });
});
