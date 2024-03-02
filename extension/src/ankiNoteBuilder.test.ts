import { test, expect, describe, jest } from "@jest/globals";
import { AnkiNoteBuilder, type MarkerData } from "./ankiNoteBuilder";
import { Entry } from "./dicEntry";
import type { TokenizeResult } from "./backend";

const tokenized: TokenizeResult = {
  tokens: [
    {
      "text": "わたし",
      "start": 0,
      "children": [],
      "pos": "代名詞",
      "pos2": "*",
      "base": "私",
      "reading": "わたし",
      "conj_form": "*"
    },
    {
      "text": "は",
      "start": 3,
      "children": [],
      "pos": "助詞",
      "pos2": "係助詞",
      "base": "は",
      "reading": "は",
      "conj_form": "*"
    },
    {
      "text": "本",
      "start": 4,
      "children": [],
      "pos": "名詞",
      "pos2": "普通名詞",
      "base": "本",
      "reading": "ほん",
      "conj_form": "*"
    },
    {
      "text": "が",
      "start": 5,
      "children": [],
      "pos": "助詞",
      "pos2": "格助詞",
      "base": "が",
      "reading": "が",
      "conj_form": "*"
    },
    {
      "text": "読みたい",
      "start": 6,
      "children": [
        {
          "text": "読み",
          "start": 6,
          "children": [],
          "pos": "動詞",
          "pos2": "一般",
          "base": "読む",
          "reading": "ヨミ",
          "conj_form": "連用形-一般"
        },
        {
          "text": "たい",
          "start": 8,
          "children": [],
          "pos": "助動詞",
          "pos2": "*",
          "base": "たい",
          "reading": "タイ",
          "conj_form": "連体形-一般"
        }
      ],
      "pos": "動詞",
      "pos2": "*",
      "base": "読む",
      "reading": "よみたい",
      "conj_form": "*"
    },
    {
      "text": "。",
      "start": 10,
      "children": [],
      "pos": "UNK",
      "pos2": "*",
      "base": "",
      "reading": "。",
      "conj_form": "*"
    }
  ],
  tokenIdx: 4,
  entries: [
    {
      terms: ["読む", "讀む", "よむ"],
      forms: [
        {
          form: "読む",
        },
        {
          form: "讀む",
          uncommon: true,
          info: ["=sK="],
        },
      ],
      readings: [
        {
          reading: "よむ",
        },
      ],
      senses: [
        {
          pos: ["verb"],
          meaning: ["to read"],
        },
        {
          pos: ["verb"],
          meaning: ["to recite (e.g. a sutra)", "to chant"],
        },
        {
          pos: ["verb"],
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
          pos: ["verb"],
          meaning: ["to decipher"],
        },
        {
          pos: ["verb"],
          info: ["now mostly used in idioms"],
          meaning: ["to count", "to estimate"],
        },
        {
          pos: ["verb"],
          info: ["also written as 訓む"],
          meaning: ["to read (a kanji) with its native Japanese reading"],
        },
      ],
      priority: 163,
    },
  ].map(Entry.fromObject),
  grammars: [],
};

const data: MarkerData = {
  tokenized,
  entry: tokenized.entries[0],
  selectedMeaning: tokenized.entries[0].senses[2],
  sentence: "わたしは本が読みたい。",
  url: "https://yomikiri.jest/",
  pageTitle: "Yomikiri tests",
};

describe("AnkiNoteBuilder marker", () => {
  test("''", async () => {
    const value = await AnkiNoteBuilder.markerValue("", data);
    expect(value).toBe("");
  });
  test("word", async () => {
    const value = await AnkiNoteBuilder.markerValue("word", data);
    expect(value).toBe("読みたい");
  });
  test("word-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue("word-furigana", data);
    expect(value).toBe("読[よ]みたい");
  });
  test("word-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue("word-kana", data);
    expect(value).toBe("よみたい");
  });
  test("dict", async () => {
    const value = await AnkiNoteBuilder.markerValue("dict", data);
    expect(value).toBe("読む");
  });
  test("dict-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue("dict-furigana", data);
    expect(value).toBe("読[よ]む");
  });
  test("dict-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue("dict-kana", data);
    expect(value).toBe("よむ");
  });
  test("sentence", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence", data);
    expect(value).toBe("わたしは本が<b>読みたい</b>。");
  });
  test("sentence-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-furigana", data);
    expect(value).toBe("わたしは 本[ほん]が<b>読[よ]みたい</b>。");
  });
  test("sentence-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-kana", data);
    expect(value).toBe("わたしはほんが<b>よみたい</b>。");
  });
  test("translated-sentence", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "translated-sentence",
      data
    );
    expect(typeof value).toBe("string");
  });
  test("sentence-cloze", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-cloze", data);
    expect(value).toBe("わたしは本が{{c1::読みたい}}。");
  });
  test("sentence-cloze-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "sentence-cloze-furigana",
      data
    );
    expect(value).toBe("わたしは 本[ほん]が{{c1::読[よ]みたい}}。");
  });
  test("meaning", async () => {
    const value = await AnkiNoteBuilder.markerValue("meaning", data);
    expect(value).toBe(
      "to predict, to guess, to forecast, to read (someone's thoughts), to see (e.g. into someone's heart), to divine"
    );
  });
  test("meaning-full", async () => {
    const value = await AnkiNoteBuilder.markerValue("meaning-full", data);
    expect(value).toBe(
      [
        "to read",
        "to recite (e.g. a sutra), to chant",
        "to predict, to guess, to forecast, to read (someone's thoughts), to see (e.g. into someone's heart), to divine",
        "to decipher",
        "to count, to estimate",
        "to read (a kanji) with its native Japanese reading",
      ]
        .map((v) => `<span class="yk-meaning">${v}</span>`)
        .join("<br>")
    );
  });
  test("meaning-short", async () => {
    const value = await AnkiNoteBuilder.markerValue("meaning-short", data);
    expect(value).toBe("to predict, to guess");
    delete data.selectedMeaning;
    const valueFull = await AnkiNoteBuilder.markerValue("meaning-short", data);
    expect(valueFull).toBe("to read; to recite (e.g. a sutra); to predict");
  });
  test("url", async () => {
    const value = await AnkiNoteBuilder.markerValue("url", data);
    expect(value).toBe("https://yomikiri.jest/");
  });
  test("link", async () => {
    document.title = "Yomikiri tests";
    console.log();
    const value = await AnkiNoteBuilder.markerValue("link", data);
    expect(value).toBe('<a href="https://yomikiri.jest/">Yomikiri tests</a>');
  });
});

const escapeTokenizeResult: TokenizeResult = {
  tokens: [
    {
      text: "図書",
      pos: "名詞",
      base: "図書",
      reading: "としょ",
      pos2: "一般",
      start: 0,
      children: [],
      conj_form: "*"
    },
    {
      text: "<",
      pos: "UNK",
      base: "<",
      reading: "<",
      pos2: "*",
      start: 2,
      children: [],
      conj_form: "*"
    },
  ],
  tokenIdx: 0,
  entries: [
    {
      forms: [
        {
          form: "図書",
        },
      ],
      readings: [
        {
          reading: "としょ",
        },
        {
          reading: "ずしょ",
        },
      ],
      senses: [
        {
          pos: ["noun"],
          meaning: ["books<"],
        },
      ],
      priority: 166,
    },
  ].map(Entry.fromObject),
  grammars: [],
};
const escapedData: MarkerData = {
  tokenized: escapeTokenizeResult,
  entry: escapeTokenizeResult.entries[0],
  selectedMeaning: escapeTokenizeResult.entries[0].senses[0],
  sentence: "図書<",
  url: "https://yomikiri.jest/",
  pageTitle: "Yomikiri tests",
};

describe("AnkiNoteBuilder escape HTML", () => {
  test("sentence", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence", escapedData);
    expect(value).toBe("<b>図書</b>&lt;");
  });
  test("sentence-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "sentence-furigana",
      escapedData
    );
    expect(value).toBe("<b>図書[としょ]</b>&lt;");
  });
  test("sentence-cloze-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "sentence-cloze-furigana",
      escapedData
    );
    expect(value).toBe("{{c1::図書[としょ]}}&lt;");
  });
  test("sentence-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "sentence-kana",
      escapedData
    );
    expect(value).toBe("<b>としょ</b>&lt;");
  });
  test("meaning", async () => {
    const value = await AnkiNoteBuilder.markerValue("meaning", escapedData);
    expect(value).toBe("books&lt;");
  });
  test("meaning-full", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "meaning-full",
      escapedData
    );
    expect(value).toBe('<span class="yk-meaning">books&lt;</span>');
  });
  test("meaning-short", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "meaning-short",
      escapedData
    );
    expect(value).toBe("books&lt;");
  });
});
