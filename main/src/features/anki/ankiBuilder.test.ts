/*
  Test that the Anki Field Builder's output remains unchanged.

  Note that an update to the JMDict's dictionary or the tokenizer backend may break tests,
  in which case 'Check that tokenization result has not changed' test will fail.
  Go to previously fine commit and update the snapshot.

*/

import { test, expect, describe } from "vitest";
import {
  buildAnkiField,
  type AnkiBuilderContext,
  type AnkiBuilderData,
} from "./ankiBuilder";
import { Config } from "../config";
import { ankiTemplateFieldLabel, type AnkiTemplateField } from "./template";
import {
  DesktopBackend,
  type TokenizeResult,
} from "@/platform/desktop/backend";
import tokenizeResults from "./ankiBuilder.test.json" with { type: "json" };

import fs from "node:fs";
import path from "node:path";
import * as prettier from "prettier";
import type { WordEntry } from "@yomikiri/backend-bindings";

// ankiBuilder.test.json is used so that an update to JMDict will not invalidate the test.
//
// When `TokenizeResult` struct has been modified, you should re-generate ankiBuilder.test.json
// by running the test with `UPDATE=1 pnpm vitest --run ankiBuilder`
const REGENERATE_JSON = !!process.env.UPDATE;

const config = await Config.instance.get();
const ctx: AnkiBuilderContext = {
  config,
};

interface TestCase {
  idx: number;
  sentence: string;
  label: string;
}

const tests: TestCase[] = [
  {
    label: "＄読みたい",
    sentence: "読みたい",
    idx: 0,
  },
  {
    label: "春の茶が飲＄みたいです",
    sentence: "春の茶が飲みたいです",
    idx: 5,
  },
  { label: "$なかなかに強いです", sentence: "なかなかに強いです", idx: 0 },
  {
    label: "Special character is escaped: 図＄書<->",
    sentence: "図書<->",
    idx: 1,
  },
  // 「か\u{3099}」 -> 「が」
  {
    label: "Unicode normalization: 彼か＄\u{3099}学生",
    sentence: "彼か\u{3099}学生",
    idx: 2,
  },
];

describe.skipIf(REGENERATE_JSON).each(tests)(
  "$label",
  ({ label, sentence }) => {
    // don't generate 'data' when regenerating json
    if (REGENERATE_JSON) return;

    const tokenizedResult = (
      tokenizeResults as { [label: string]: TokenizeResult }
    )[label];
    if (tokenizedResult === undefined) {
      throw new Error(`Test label not found in 'ankiBuilder.test.json'.
If you modified the test cases of ankiBuilder.test.ts,
you need to set \`const REGENERATE_JSON = true\` and run the test
to regenerate 'ankiBuilder.test.json' file.

Missing label: ${label}`);
    }

    const data: AnkiBuilderData = {
      tokenized: tokenizedResult,
      entry: tokenizedResult.entries[0].entry as WordEntry,
      sentence,
      url: "https://yomikiri.test/",
      pageTitle: "Yomikiri Tests",
    };

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
      selected: {
        entry: data.entry,
        sense: data.entry.groupedSenses[0].senses[0],
        partOfSpeech: data.entry.groupedSenses[0].pos,
      },
    };
    test.each(singleTemplateFields)("(single) $label", async ({ template }) => {
      const field = buildAnkiField(ctx, singleData, template);
      const value = await field.value;
      expect(value).toMatchSnapshot();
    });
  },
);

test.skipIf(!REGENERATE_JSON)("Re-generate tokenize() result", async () => {
  const filePath = expect.getState().testPath;
  if (filePath === undefined) {
    throw new Error("Could not retrieve file path of ankiBuilder.test.ts");
  }

  const results: { [label: string]: TokenizeResult } = {};
  for (const test of tests) {
    const tokenizeResult = await DesktopBackend.tokenize({
      text: test.sentence,
      charAt: test.idx,
    });
    results[test.label] = tokenizeResult;
  }

  const resultsJson = JSON.stringify(results);
  const formatted = await prettier.format(resultsJson, {
    experimentalTernaries: true,
    parser: "json",
  });
  await fs.promises.writeFile(
    path.resolve(filePath, "../ankiBuilder.test.json"),
    formatted,
    { encoding: "utf-8" },
  );
  // expect(1).toEqual(1)
});

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
