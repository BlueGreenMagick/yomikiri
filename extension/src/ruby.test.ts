/**
 * @jest-environment jsdom
 */
import { test, expect, describe } from "@jest/globals";
import { RubyString } from "./ruby";

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
