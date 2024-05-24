import { test, expect, describe } from "vitest";
import { AnkiNoteBuilder, buildAnkiField, type AnkiBuilderContext, type AnkiBuilderData } from "./ankiBuilder";
import { Entry, type EntryObject } from "../dicEntry";
import type { TokenizeResult } from "@platform/backend";
import { DesktopPlatform } from "platform/desktop";
import { BrowserApi } from "../../extension/browserApi";
import Config, { defaultOptions } from "../config";
import type { AnyAnkiTemplateField } from "./template";

const browserApi = new BrowserApi({ context: "background", handleConnection: false, handleRequests: false, handleStorageChange: false })
const platform = new DesktopPlatform(browserApi)
platform.getConfig = () => { return Promise.resolve({}) }
const config = await Config.initialize(platform);
const backend = await platform.newBackend()
const ctx: AnkiBuilderContext = {
  platform,
  config
}

function generateAllFieldTemplates(): AnyAnkiTemplateField[] {

}




describe("Build Anki Fields 1", async () => {
  const sentence = "Abc"
  const tokenizedResult = await backend.tokenize(sentence, 10)
  const data: AnkiBuilderData = {
    tokenized: tokenizedResult,
    entry: tokenizedResult.entries[0],
    sentence,
    url: "https://yomikiri.test/",
    pageTitle: "Yomikiri Tests"
  }

  test("Tokenization result has not changed", () => {
    expect(data).toMatchSnapshot()
  })

  test.each(generateAllFieldTemplates())("name", () => {

  })
})





describe("AnkiNoteBuilder marker", () => {
  test("''", async () => {
    const value = await AnkiNoteBuilder.markerValue("", ctx, data);
    expect(value).toBe("");
  });
  test("word", async () => {
    const value = await AnkiNoteBuilder.markerValue("word", ctx, data);
    expect(value).toBe("読みたい");
  });
  test("word-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue("word-furigana", ctx, data);
    expect(value).toBe("読[よ]みたい");
  });
  test("word-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue("word-kana", ctx, data);
    expect(value).toBe("よみたい");
  });
  test("dict", async () => {
    const value = await AnkiNoteBuilder.markerValue("dict", ctx, data);
    expect(value).toBe("読む");
  });
  test("dict-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue("dict-furigana", ctx, data);
    expect(value).toBe("読[よ]む");
  });
  test("dict-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue("dict-kana", ctx, data);
    expect(value).toBe("よむ");
  });
  test("sentence", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence", ctx, data);
    expect(value).toBe("わたしは本が<b>読みたい</b>。");
  });
  test("sentence-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-furigana", ctx, data);
    expect(value).toBe("わたしは 本[ほん]が<b>読[よ]みたい</b>。");
  });
  test("sentence-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-kana", ctx, data);
    expect(value).toBe("わたしはほんが<b>よみたい</b>。");
  });
  test("translated-sentence", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "translated-sentence", ctx,
      data
    );
    expect(typeof value).toBe("string");
  });
  test("sentence-cloze", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence-cloze", ctx, data);
    expect(value).toBe("わたしは本が{{c1::読みたい}}。");
  });
  test("sentence-cloze-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "sentence-cloze-furigana", ctx,
      data
    );
    expect(value).toBe("わたしは 本[ほん]が{{c1::読[よ]みたい}}。");
  });
  test("meaning", async () => {
    const value = await AnkiNoteBuilder.markerValue("meaning", ctx, data);
    expect(value).toBe(
      "to predict, to guess, to forecast, to read (someone's thoughts), to see (e.g. into someone's heart), to divine"
    );
  });
  test("meaning-full", async () => {
    const value = await AnkiNoteBuilder.markerValue("meaning-full", ctx, data);
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
    const value = await AnkiNoteBuilder.markerValue("meaning-short", ctx, data);
    expect(value).toBe("to predict, to guess");
    delete data.selectedMeaning;
    const valueFull = await AnkiNoteBuilder.markerValue("meaning-short", ctx, data);
    expect(valueFull).toBe("to read; to recite (e.g. a sutra); to predict");
  });
  test("url", async () => {
    const value = await AnkiNoteBuilder.markerValue("url", ctx, data);
    console.log(value)
    expect(value).toBe("https://yomikiri.test/");
  });
  test("link", async () => {
    document.title = "Yomikiri tests";
    const value = await AnkiNoteBuilder.markerValue("link", ctx, data);
    expect(value).toBe('<a href="https://yomikiri.test/">Yomikiri tests</a>');
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
  entries: ([
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
  ] as EntryObject[]).map(Entry.fromObject),
  grammars: [],
};
const escapedData: AnkiBuilderData = {
  tokenized: escapeTokenizeResult,
  entry: escapeTokenizeResult.entries[0],
  selectedMeaning: escapeTokenizeResult.entries[0].senses[0],
  sentence: "図書<",
  url: "https://yomikiri.test/",
  pageTitle: "Yomikiri tests",
};

describe("AnkiNoteBuilder escape HTML", () => {
  test("sentence", async () => {
    const value = await AnkiNoteBuilder.markerValue("sentence", ctx, escapedData);
    expect(value).toBe("<b>図書</b>&lt;");
  });
  test("sentence-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "sentence-furigana", ctx,
      escapedData
    );
    expect(value).toBe("<b>図書[としょ]</b>&lt;");
  });
  test("sentence-cloze-furigana", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "sentence-cloze-furigana", ctx,
      escapedData
    );
    expect(value).toBe("{{c1::図書[としょ]}}&lt;");
  });
  test("sentence-kana", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "sentence-kana", ctx,
      escapedData
    );
    expect(value).toBe("<b>としょ</b>&lt;");
  });
  test("meaning", async () => {
    const value = await AnkiNoteBuilder.markerValue("meaning", ctx, escapedData);
    expect(value).toBe("books&lt;");
  });
  test("meaning-full", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "meaning-full", ctx,
      escapedData
    );
    expect(value).toBe('<span class="yk-meaning">books&lt;</span>');
  });
  test("meaning-short", async () => {
    const value = await AnkiNoteBuilder.markerValue(
      "meaning-short", ctx,
      escapedData
    );
    expect(value).toBe("books&lt;");
  });
});
