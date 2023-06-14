/**
 * @jest-environment jsdom
 */
import { test, expect, describe } from "@jest/globals";
import { RubyString, toHiragana, toKatakana } from "./japanese";

describe("RubyString", () => {
  test("generate", () => {
    expect(RubyString.generate("", "")).toEqual([]);
    expect(RubyString.generate("あエw1.", "あエw1.")).toEqual([
      { base: "あエw1." },
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
    expect(RubyString.generate("書式付き形式", "しょしきつきけいしき")).toEqual(
      [
        { base: "書式付", ruby: "しょしきつ" },
        { base: "き" },
        { base: "形式", ruby: "けいしき" },
      ]
    );

    return;
    // TODO: furigana for joined-tokens may generate incorrectly
    // Below fails even though '配信の否認不能' is an entry in jmdict.
    expect(
      RubyString.generate("配信の否認不能", "はいしんのひにんふのう")
    ).toEqual([
      { base: "配信", ruby: "はいしん" },
      { base: "の" },
      { base: "否認不能", ruby: "ひにんふのう" },
    ]);
  });

  test("generate katakana", () => {
    expect(RubyString.generate("ド真ん中", "どまんなか")).toEqual([
      { base: "ド" },
      { base: "真", ruby: "ま" },
      { base: "ん" },
      { base: "中", ruby: "なか" },
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
