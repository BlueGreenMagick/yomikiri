import { test, expect, describe, jest } from "@jest/globals";
import { AnkiNoteBuilder, type MarkerData } from "./ankiNoteBuilder";
import type { ScanResult } from "./content/scanner";
import { Entry } from "./dicEntry";

const scanResult: ScanResult = {
  token: {
    text: "読みたい",
    partOfSpeech: "動詞",
    baseForm: "読む",
    reading: "よみたい",
    pos2: "自立",
  },
  range: new Range(),
  sentence: "わやしは本が読みたい",
  startIdx: 6,
  endIdx: 10,
  sentenceTokens: [
    {
      text: "わや",
      partOfSpeech: "名詞",
      baseForm: "わや",
      reading: "わや",
      pos2: "一般",
    },
    {
      text: "しは",
      baseForm: "しは",
      reading: "しは",
      partOfSpeech: "=exp=",
      pos2: "*",
    },
    {
      text: "本",
      partOfSpeech: "名詞",
      baseForm: "本",
      reading: "ほん",
      pos2: "一般",
    },
    {
      text: "が",
      partOfSpeech: "助詞",
      baseForm: "が",
      reading: "が",
      pos2: "格助詞",
    },
    {
      text: "読みたい",
      partOfSpeech: "動詞",
      baseForm: "読む",
      reading: "よみたい",
      pos2: "自立",
    },
  ],
  tokenIdx: 4,
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
    expect(value).toBe("わやしは本が<b>読みたい</b>");
  });
  test("sentence-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-furigana", data);
    expect(value).toBe("わやしは 本[ほん]が<b>読[よ]みたい</b>");
  });
  test("sentence-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-kana", data);
    expect(value).toBe("わやしはほんが<b>よみたい</b>");
  });
  test("sentence-translate", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-translate", data);
    expect(typeof value).toBe("string");
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
    partOfSpeech: "名詞",
    baseForm: "図書",
    reading: "としょ",
    pos2: "一般",
  },
  range: new Range(),
  sentence: "図書<",
  startIdx: 0,
  endIdx: 2,
  sentenceTokens: [
    {
      text: "図書",
      partOfSpeech: "名詞",
      baseForm: "図書",
      reading: "としょ",
      pos2: "一般",
    },
    {
      text: "<",
      partOfSpeech: "UNK",
      baseForm: "<",
      reading: "<",
      pos2: "*",
    },
  ],
  tokenIdx: 0,
  dicEntries: [
    Entry.fromObject({
      forms: [
        {
          form: "図書",
          priority: ["ichi1", "news1", "nf09"],
        },
      ],
      readings: [
        {
          reading: "としょ",
          priority: ["ichi1", "news1", "nf09"],
        },
        {
          reading: "ずしょ",
        },
      ],
      sense: [
        {
          partOfSpeech: ["=n="],
          meaning: ["books<"],
        },
      ],
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
