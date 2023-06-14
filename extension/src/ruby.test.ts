import { test, expect } from "@jest/globals";
import { RubyString } from "./ruby";

test("RubyString generate basic", () => {
  expect(RubyString.generate("読み切り", "よみきり")).toEqual([
    { base: "読", ruby: "よ" },
    { base: "み" },
    { base: "切", ruby: "き" },
    { base: "り" },
  ]);
});

test("RubyString to Anki", () => {
  let rubies: RubyString;
  rubies = [{ base: "読", ruby: "よ" }, { base: "む" }];
  expect(RubyString.toAnki(rubies)).toEqual("読[よ]む");
  rubies = [
    { base: "本", ruby: "ほん" },
    { base: "屋", ruby: "や" },
  ];
  expect(RubyString.toAnki(rubies)).toEqual("本[ほん] 屋[や]");
});
