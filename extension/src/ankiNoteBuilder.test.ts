import { test, expect, describe, jest } from "@jest/globals";
import { AnkiNoteBuilder, type MarkerData } from "./ankiNoteBuilder";
import type { ScanResult } from "./content/scanner";
import { Entry } from "./dicEntry";

const scanResult: ScanResult = {
  token: {
    text: "読みたい",
    pos: "動詞",
    base: "読む",
    reading: "よみたい",
    pos2: "一般",
    start: 4,
  },
  sentence: "わたしは本が読みたい",
  range: new Range(),
  startIdx: 10,
  endIdx: 6,
  tokenIdx: 4,
  sentenceTokens: [
    {
      text: "わたし",
      pos: "代名詞",
      base: "わたし",
      reading: "わたし",
      pos2: "*",
      start: 0,
    },
    {
      text: "は",
      pos: "助詞",
      base: "は",
      reading: "わ",
      pos2: "係助詞",
      start: 3,
    },
    {
      text: "本",
      pos: "名詞",
      base: "本",
      reading: "ほん",
      pos2: "普通名詞",
      start: 4,
    },
    {
      text: "が",
      pos: "助詞",
      base: "が",
      reading: "が",
      pos2: "格助詞",
      start: 5,
    },
    {
      text: "読みたい",
      pos: "動詞",
      base: "読む",
      reading: "よみたい",
      pos2: "一般",
      start: 6,
    },
  ],
  dicEntries: [
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
};

const data: MarkerData = {
  scanned: scanResult,
  entry: scanResult.dicEntries[0],
  selectedMeaning: scanResult.dicEntries[0].senses[2],
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
    expect(value).toBe("わたしは本が<b>読みたい</b>");
  });
  test("sentence-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-furigana", data);
    expect(value).toBe("わたしは 本[ほん]が<b>読[よ]みたい</b>");
  });
  test("sentence-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-kana", data);
    expect(value).toBe("わたしはほんが<b>よみたい</b>");
  });
  test("sentence-translate", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-translate", data);
    expect(typeof value).toBe("string");
  });
  test("sentence-cloze", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-cloze", data);
    expect(value).toBe("わたしは本が{{c1::読みたい}}");
  });
  test("sentence-cloze-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "sentence-cloze-furigana",
      data
    );
    expect(value).toBe("わたしは 本[ほん]が{{c1::読[よ]みたい}}");
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

const escapeScanResult: ScanResult = {
  token: {
    text: "図書",
    pos: "名詞",
    base: "図書",
    reading: "としょ",
    pos2: "一般",
    start: 2,
  },
  range: new Range(),
  sentence: "図書<",
  startIdx: 0,
  endIdx: 2,
  sentenceTokens: [
    {
      text: "図書",
      pos: "名詞",
      base: "図書",
      reading: "としょ",
      pos2: "一般",
      start: 0,
    },
    {
      text: "<",
      pos: "UNK",
      base: "<",
      reading: "<",
      pos2: "*",
      start: 2,
    },
  ],
  tokenIdx: 0,
  dicEntries: [
    Entry.fromObject({
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
    }),
  ],
};
const escapedData: MarkerData = {
  scanned: escapeScanResult,
  entry: escapeScanResult.dicEntries[0],
  selectedMeaning: escapeScanResult.dicEntries[0].senses[0],
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
