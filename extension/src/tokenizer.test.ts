import {
  test,
  expect,
  describe,
  beforeAll,
  beforeEach,
  jest,
} from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import pako from "pako";
import type { Dictionary } from "./dictionary";
import { Tokenizer } from "./background/backend";
import { Entry } from "../src/dicEntry";

let tokenizer: Tokenizer;
let dictionary: Dictionary;

const MockDictionary = (ents: Entry[]): Dictionary => {
  const entries = ents;
  return {
    search: async (
      term: string,
      filter?: (entry: Entry) => boolean
    ): Promise<Entry[]> => {
      let result = entries.filter((e) => e.terms.includes(term));
      if (filter !== undefined) {
        result = result.filter(filter);
      }
      return result;
    },
    hasStartsWith: async (
      term: string,
      filter?: (entry: Entry) => boolean
    ): Promise<boolean> => {
      if (!filter) {
        filter = (e: Entry) => true;
      }
      const f = filter;
      const entry = entries.filter(f).find((e) => {
        for (const t of e.terms) {
          if (t.startsWith(term)) return true;
        }
        return false;
      });
      return entry !== undefined;
    },
  } as Dictionary;
};

MockDictionary.initialize = async () => {
  const p = path.join(__dirname, "..", "src", "assets", "jmdict", "en.json.gz");
  const data = fs.readFileSync(p);
  const unzipped = pako.ungzip(data, { to: "string" }) as string;
  const entryObjects = JSON.parse(unzipped) as any[];
  const entries = entryObjects.map(Entry.fromObject);
  return MockDictionary(entries);
};

beforeAll(async () => {
  const dictP = MockDictionary.initialize();
  dictionary = await dictP;
  console.debug("Jest setup: Installed dictionary");
  tokenizer = await Tokenizer.initialize(dictP);
}, 990000);

async function testTokenSplit(expected: string) {
  const text = expected.replace(/\//g, "");
  const result = await tokenizer.tokenize({ text, charIdx: 0 });
  const tokens = result.tokens;
  const joinedTokens = tokens.map((v) => v.text).join("/");
  expect(joinedTokens).toBe(expected);
}

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

describe("tokenizer", () => {
  test("MockDictionary", async () => {
    expect(await dictionary.hasStartsWith("だかいさ")).toBe(true);
  });

  describe.each([
    "私/は/学生/です",
    //　「じゃ」 is mistakenly recognized as 「だ」 with unidic
    // 「じゃない」(exp,adj-i)＜助動詞「じゃ｜だ」＋形容詞「なかっ」＋助動詞「た」>
    "この/本/は/よく/じゃなかった",
    // 「かもしれない」(exp)＜副助詞「か」係助詞「も」動詞「しれ」助動詞「ない」＞
    "魚フライ/を/食べた/かもしれない/猫",
    // 「について」(exp)＜格助詞「に」動詞「つい」接続助詞「て」＞
    "地震/について/語る",
    // 「には」(prt)<助詞「に」助詞「は」＞
    "街/には/行く",
    // 「それで」(conj)＜「それ」格助詞「で」＞
    "それで/読めた",
    /// # Inflection
    // 「そう」＜形状詞「そう」助動詞「な」＞
    "聞こえて/き/そうな/くらい",
    // 「生まれる」＜動詞「生まれ」、助動詞「まし」、助動詞「た」＞
    "奇跡的/に/生まれました",
    // 「する」＜動詞「し」、助動詞「ませ」、助動詞「ん」、助動詞「でし」助動詞「た」＞
    "だから/しませんでした",
    /// # Prefix
    // 「全否定」＜接頭辞「全」名詞「否定」＞
    "全否定",
    // 「お母さん」（n)＜接頭辞「お」名詞「母」接尾辞「さん」＞
    "お母さん/だ",
    // 「この間」(n)<連体詞「この」名詞「間」＞
    "この間/は",
    // don't compound (not 私/はしる)
    "私/は/しる",
  ])("join tokens", (c: string) => {
    test(c, async () => {
      await testTokenSplit(c);
    });
  });

  test("decomposed unicode", async () => {
    // て\u3099 = で
    const result = await tokenizer.tokenize({
      text: "本か\u3099好きだ",
      charIdx: 2,
    });
    const startIdx = result.tokens.map((t) => t.start);
    expect(startIdx[0]).toBe(0);
    expect(startIdx[1]).toBe(1);
    expect(startIdx[2]).toBe(3);
    expect(result.tokens[1].text).toBe("が");
  });
});
