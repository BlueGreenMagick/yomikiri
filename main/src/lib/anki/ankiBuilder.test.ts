/*
  Test that the Anki Field Builder's output remains unchanged.

  Note that an update to the JMDict's dictionary or the tokenizer backend may break tests,
  in which case 'Check that tokenization result has not changed' test will fail.
  Go to previously fine commit and update the snapshot.

*/
// mocks should be put at top of file
import "@test/mock";

import { test, expect, describe } from "vitest";
import {
  buildAnkiField,
  type AnkiBuilderContext,
  type AnkiBuilderData,
} from "./ankiBuilder";
import { DesktopPlatform } from "platform/desktop";
import { BrowserApi } from "extension/browserApi";
import { Config } from "../config";
import { ankiTemplateFieldLabel, type AnkiTemplateField } from "./template";

const browserApi = new BrowserApi({
  context: "background",
  handleConnection: false,
  handleRequests: false,
  handleStorageChange: false,
});
const platform = new DesktopPlatform(browserApi);
const config = await Config.initialize(platform);
const backend = await platform.newBackend();
const ctx: AnkiBuilderContext = {
  platform,
  config,
};

describe("＄読みたい", async () => {
  await testSentence("読みたい", 0);
});

describe("春の茶が飲＄みたいです", async () => {
  await testSentence("春の茶が飲＄みたいです", 5);
});

describe("Test that special character is escaped: 図＄書<->", async () => {
  await testSentence("図書<->", 1);
});

// 「か\u{3099}」 -> 「が」
describe("Test unicode normalization: 彼か＄\u{3099}学生", async () => {
  await testSentence("彼か\u{3099}学生", 2);
});

async function testSentence(sentence: string, charIdx: number): Promise<void> {
  const tokenizedResult = await backend.tokenize(sentence, charIdx);
  const data: AnkiBuilderData = {
    tokenized: tokenizedResult,
    entry: tokenizedResult.entries[0],
    sentence,
    url: "https://yomikiri.test/",
    pageTitle: "Yomikiri Tests",
  };

  test("Check that tokenization result has not changed", () => {
    expect(data).toMatchSnapshot();
  });

  const options = generateAllFieldTemplateOptions();
  test.each(options)("$label", async ({ template }) => {
    const field = buildAnkiField(ctx, data, template);
    const value = await field.value;
    expect(value).toMatchSnapshot();
  });

  // Test specific meaning field generation
  const singleTemplateFields = generateSingleMeaningFieldTemplates();
  const singleData: AnkiBuilderData = {
    ...data,
    selectedMeaning: data.entry.senses[0],
  };
  test.each(singleTemplateFields)("(single) $label", async ({ template }) => {
    const field = buildAnkiField(ctx, singleData, template);
    const value = await field.value;
    expect(value).toMatchSnapshot();
  });
}

interface TemplateFieldAndLabel {
  template: AnkiTemplateField;
  label: string;
}

function generateAllFieldTemplateOptions(): TemplateFieldAndLabel[] {
  const templates: AnkiTemplateField[] = [];
  // field templates with no options
  for (const content of ["", "translated-sentence", "url", "link"] as const) {
    templates.push({
      name: "field",
      content,
    });
  }

  // content: "word"
  for (const form of ["as-is", "dict-form", "main-dict-form"] as const) {
    for (const style of [
      "basic",
      "furigana-anki",
      "furigana-html",
      "kana-only",
    ] as const) {
      templates.push({
        name: "field",
        content: "word",
        form,
        style,
      });
    }
  }
  // content: "sentence"
  for (const word of ["none", "cloze", "bold", "span"] as const) {
    for (const style of [
      "basic",
      "furigana-anki",
      "furigana-html",
      "kana-only",
    ] as const) {
      templates.push({
        name: "field",
        content: "sentence",
        word,
        style,
      });
    }
  }

  // content: "meaning" (full)
  for (const full_format of [
    "numbered",
    "unnumbered",
    "line",
    "div",
    "yomichan",
  ] as const) {
    for (const full_pos of [true, false]) {
      for (const full_max_item of [0, 2]) {
        templates.push({
          name: "field",
          content: "meaning",
          full_format,
          full_pos,
          full_max_item,
          single_pos: full_pos,
          single_max_item: 0,
        });
      }
    }
  }

  return templates.map((template) => {
    return {
      template,
      label: ankiTemplateFieldLabel(template),
    };
  });
}

/** content: "meaning" for specific meaning */
function generateSingleMeaningFieldTemplates(): TemplateFieldAndLabel[] {
  const templates: AnkiTemplateField[] = [];
  for (const single_pos of [true, false]) {
    for (const single_max_item of [0, 2]) {
      templates.push({
        name: "field",
        content: "meaning",
        full_format: "numbered",
        full_pos: single_pos,
        full_max_item: 0,
        single_pos,
        single_max_item,
      });
    }
  }
  return templates.map((template) => ({
    template,
    label: ankiTemplateFieldLabel(template),
  }));
}
