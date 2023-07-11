import type { MarkerData } from "~/ankiNoteBuilder";
import type { ScanResult } from "~/content/scanner";
import { Entry } from "~/dicEntry";

const scanData: ScanResult = {
  dicEntries: [
    {
      terms: ["食べる", "喰べる", "たべる"],
      forms: [
        {
          form: "食べる",
        },
        {
          form: "喰べる",
          info: ["=iK="],
        },
      ],
      readings: [
        {
          reading: "たべる",
        },
      ],
      senses: [
        {
          pos: ["verb"],
          meaning: ["to eat"],
        },
        {
          pos: ["verb"],
          meaning: [
            "to live on (e.g. a salary)",
            "to live off",
            "to subsist on",
          ],
        },
      ],
      priority: 130,
    },
  ].map(Entry.fromObject),
  token: {
    text: "喰べたい",
    pos: "動詞",
    base: "喰べる",
    reading: "たべたい",
    pos2: "一般",
    start: 6,
  },
  range: new Range(),
  sentence: "本好きが本が喰べたい。",
  startIdx: 6,
  endIdx: 10,
  sentenceTokens: [
    {
      text: "本好き",
      pos: "形状詞",
      base: "本好き",
      reading: "ほんずき",
      pos2: "一般",
      start: 0,
    },
    {
      text: "が",
      pos: "助詞",
      base: "が",
      reading: "が",
      pos2: "格助詞",
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
      text: "喰べたい",
      pos: "動詞",
      base: "喰べる",
      reading: "たべたい",
      pos2: "一般",
      start: 6,
    },
    {
      text: "。",
      pos: "補助記号",
      base: "。",
      reading: "",
      pos2: "句点",
      start: 10,
    },
  ],
  tokenIdx: 4,
};

export const exampleMarkerData: MarkerData = {
  scanned: scanData,
  entry: scanData.dicEntries[0],
  selectedMeaning: scanData.dicEntries[0].senses[0],
};

export const exampleTranslatedSentence = "Book lovers want to eat books.";
