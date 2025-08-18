import { expect, test } from "vitest";
import { migrateV1 } from "./migrateV1";
import type { StoredConfigurationV1 } from "./types/typesV1";

type StoredConfigurationVersion2 = StoredConfigurationV1 & { config_version: 2 };

const config2: StoredConfigurationVersion2 = {
  version: "0.1.3",
  "anki.enabled": true,
  "anki.connect_port": 8766,
  "anki.template": {
    deck: "Default",
    notetype: "Many Fields",
    fields: [
      {
        name: "Front",
        value: "word",
      },
      {
        name: "Back",
        value: "word-furigana",
      },
      {
        name: "3",
        value: "word-kana",
      },
      {
        name: "4",
        value: "dict",
      },
      {
        name: "5",
        value: "dict-furigana",
      },
      {
        name: "6",
        value: "dict-kana",
      },
      {
        name: "7",
        value: "main-dict",
      },
      {
        name: "8",
        value: "main-dict-furigana",
      },
      {
        name: "9",
        value: "main-dict-kana",
      },
      {
        name: "10",
        value: "sentence",
      },
      {
        name: "11",
        value: "sentence-furigana",
      },
      {
        name: "12",
        value: "sentence-kana",
      },
      {
        name: "13",
        value: "sentence-cloze",
      },
      {
        name: "14",
        value: "sentence-cloze-furigana",
      },
      {
        name: "15",
        value: "translated-sentence",
      },
      {
        name: "16",
        value: "meaning",
      },
      {
        name: "a",
        value: "meaning-full",
      },
      {
        name: "b",
        value: "meaning-short",
      },
      {
        name: "c",
        value: "url",
      },
      {
        name: "d",
        value: "link",
      },
    ],
    tags: "tag1 tag2",
  },
  "general.font_size": 16,
  config_version: 2,
};

test("migrate StoredConfigurationV1(config_version=2) to StoredConfigurationV2", () => {
  const { config } = migrateV1({ config: config2 });
  expect(config).toMatchSnapshot();
});
