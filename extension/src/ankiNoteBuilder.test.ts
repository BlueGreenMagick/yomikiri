/**
 * @jest-environment jsdom
 */
import { test, expect, describe } from "@jest/globals";
import { AnkiNoteBuilder, type MarkerData } from "./ankiNoteBuilder";
import type { ScanResult } from "./content/scanner";

const scanResult: ScanResult = {
  token: {
    text: "読みたい",
    partOfSpeech: "動詞",
    baseForm: "読む",
    reading: "ヨミタイ",
    pos2: "自立",
  },
  range: new Range(),
  sentence: "わやしは本が読みたい",
  startIdx: 6,
  endIdx: 8,
  sentenceTokens: [
    {
      text: "わや",
      partOfSpeech: "名詞",
      baseForm: "わや",
      reading: "ワヤ",
      pos2: "一般",
    },
    {
      text: "しは",
      baseForm: "しは",
      reading: "シハ",
      partOfSpeech: "=exp=",
      pos2: "*",
    },
    {
      text: "本",
      partOfSpeech: "名詞",
      baseForm: "本",
      reading: "ホン",
      pos2: "一般",
    },
    {
      text: "が",
      partOfSpeech: "助詞",
      baseForm: "が",
      reading: "ガ",
      pos2: "格助詞",
    },
    {
      text: "読みたい",
      partOfSpeech: "動詞",
      baseForm: "読む",
      reading: "ヨミタイ",
      pos2: "自立",
    },
  ],
  dicEntries: [
    {
      terms: ["読む", "讀む", "よむ"],
      forms: [
        {
          form: "読む",
          info: [],
          priority: ["ichi1", "news1", "nf12"],
        },
        {
          form: "讀む",
          info: ["=sK="],
          priority: [],
        },
      ],
      readings: [
        {
          reading: "よむ",
          nokanji: false,
          toForm: [],
          info: [],
          priority: ["ichi1", "news1", "nf12"],
        },
      ],
      senses: [
        {
          toForm: [],
          toReading: [],
          partOfSpeech: ["=v5m=", "=vt="],
          reference: [],
          antonym: [],
          field: [],
          misc: [],
          info: [],
          dialect: [],
          meaning: ["to read"],
        },
        {
          toForm: [],
          toReading: [],
          partOfSpeech: ["=v5m=", "=vt="],
          reference: [],
          antonym: [],
          field: [],
          misc: [],
          info: [],
          dialect: [],
          meaning: ["to recite (e.g. a sutra)", "to chant"],
        },
        {
          toForm: [],
          toReading: [],
          partOfSpeech: ["=v5m=", "=vt="],
          reference: [],
          antonym: [],
          field: [],
          misc: [],
          info: [],
          dialect: [],
          meaning: [
            "to predict",
            "to guess",
            "to forecast",
            "to read (someone's thoughts)",
            "to see (e.g. into someone's heart)",
            "to divine",
          ],
        },
        {
          toForm: [],
          toReading: [],
          partOfSpeech: ["=v5m=", "=vt="],
          reference: [],
          antonym: [],
          field: [],
          misc: [],
          info: [],
          dialect: [],
          meaning: ["to decipher"],
        },
        {
          toForm: [],
          toReading: [],
          partOfSpeech: ["=v5m=", "=vt="],
          reference: ["さばを読む"],
          antonym: [],
          field: [],
          misc: [],
          info: ["now mostly used in idioms"],
          dialect: [],
          meaning: ["to count", "to estimate"],
        },
        {
          toForm: [],
          toReading: [],
          partOfSpeech: ["=v5m=", "=vt="],
          reference: ["訓む"],
          antonym: [],
          field: [],
          misc: [],
          info: ["also written as 訓む"],
          dialect: [],
          meaning: ["to read (a kanji) with its native Japanese reading"],
        },
      ],
      id: 441534,
    },
  ],
};

const data: MarkerData = {
  scanned: scanResult,
  entry: scanResult.dicEntries[0],
  selectedMeaning: scanResult.dicEntries[0].senses[1],
};

describe("AnkiNoteBuilder marker", () => {
  test("''", () => {
    const value = AnkiNoteBuilder.markerValue("", data);
    expect(value).toBe("");
  });
  test("word", () => {
    const value = AnkiNoteBuilder.markerValue("word", data);
    expect(value).toBe("読みたい");
  });
  test("word-furigana", () => {
    const value = AnkiNoteBuilder.markerValue("word-furigana", data);
    expect(value).toBe("読[よ]みたい");
  });
  test("word-kana", () => {
    const value = AnkiNoteBuilder.markerValue("word-kana", data);
    expect(value).toBe("よみたい");
  });
  test("dict", () => {
    const value = AnkiNoteBuilder.markerValue("dict", data);
    expect(value).toBe("読む");
  });
  test("sentence", () => {
    const value = AnkiNoteBuilder.markerValue("sentence", data);
    expect(value).toBe("わやしは本が読みたい");
  });
  test("sentence-kana", () => {
    const value = AnkiNoteBuilder.markerValue("sentence-kana", data);
    expect(value).toBe("わやしはほんがよみたい");
  });
});
