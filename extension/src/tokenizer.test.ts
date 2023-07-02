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
import { Tokenizer } from "./tokenizer";
import { Entry } from "../src/dicEntry";

let tokenizer: Tokenizer;
let dictionary: Dictionary;

const MockDictionary = (ents: Entry[]): Dictionary => {
  const entries = ents;
  return {
    search: async (term: string): Promise<Entry[]> => {
      return entries.filter((e) => e.terms.includes(term));
    },
    hasStartsWith: async (
      term: string,
      filter?: (entry: Entry) => boolean
    ): Promise<boolean> => {
      if (!filter) {
        filter = (e: Entry) => true;
      }
      const f = filter;
      const entry = entries.find((e) => {
        if (!f(e)) return false;
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
  const result = await tokenizer.tokenize({ text, selectedCharIdx: 0 });
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

  // TODO: fix
  describe.skip("token split", () => {
    const cases = [
      "私/は/学生/です",
      "この/本/は/よく/じゃなかった",
      // compound
      "魚/フライ/を/食べた/かもしれない/猫",
      "地震/について/語る",
      "聞こえて/き/そうな/くらい",
      "だから/しませんでした",
      "奇跡的/に/生まれました",
      // prefix compound
      "全否定",
      // don't compound
      "私/は/しる",
    ];
    for (const c of cases) {
      test(c, async () => {
        await testTokenSplit(c);
      });
    }
  });

  test("decomposed unicode", async () => {
    // て\u3099 = で
    const result = await tokenizer.tokenize({
      text: "本か\u3099好きだ",
      selectedCharIdx: 2,
    });
    const startIdx = result.tokens.map((t) => t.start);
    expect(startIdx[0]).toBe(0);
    expect(startIdx[1]).toBe(1);
    expect(startIdx[2]).toBe(3);
    expect(result.tokens[1].text).toBe("が");
  });
});
