import type { MarkerData } from "~/ankiNoteBuilder";
import type { ScanResult } from "~/content/scanner";
import { Entry } from "~/dicEntry";

const scanData: ScanResult = {
  dicEntries: [
    {
      terms: ["見る", "観る", "視る", "覧る", "みる"],
      forms: [
        {
          form: "見る",
        },
        {
          form: "観る",
        },
        {
          form: "視る",
        },
        {
          form: "覧る",
          uncommon: true,
          info: ["=sK="],
        },
      ],
      readings: [
        {
          reading: "みる",
        },
      ],
      senses: [
        {
          pos: ["verb"],
          meaning: ["to see", "to look", "to watch", "to view", "to observe"],
        },
        {
          pos: ["verb"],
          meaning: [
            "to examine",
            "to look over",
            "to assess",
            "to check",
            "to judge",
          ],
        },
        {
          pos: ["verb"],
          meaning: [
            "to look after",
            "to attend to",
            "to take care of",
            "to keep an eye on",
          ],
        },
        {
          pos: ["verb"],
          meaning: [
            "to experience",
            "to meet with (misfortune, success, etc.)",
          ],
        },
        {
          pos: ["verb"],
          misc: ["=uk="],
          info: ["after the -te form of a verb"],
          meaning: ["to try ...", "to have a go at ...", "to give ... a try"],
        },
        {
          pos: ["verb"],
          misc: ["=uk="],
          info: ["as 〜てみると, 〜てみたら, 〜てみれば, etc."],
          meaning: ["to see (that) ...", "to find (that) ..."],
        },
      ],
      priority: 161,
    },
  ].map(Entry.fromObject),
  token: {
    text: "観たい",
    pos: "動詞",
    base: "観る",
    reading: "みたい",
    pos2: "非自立可能",
    start: 6,
  },
  range: new Range(),
  sentence: "面白い映画を観たい。",
  startIdx: 6,
  endIdx: 9,
  sentenceTokens: [
    {
      text: "面白い",
      pos: "形容詞",
      base: "面白い",
      reading: "おもしろい",
      pos2: "一般",
      start: 0,
    },
    {
      text: "映画",
      pos: "名詞",
      base: "映画",
      reading: "えーが",
      pos2: "普通名詞",
      start: 3,
    },
    {
      text: "を",
      pos: "助詞",
      base: "を",
      reading: "お",
      pos2: "格助詞",
      start: 5,
    },
    {
      text: "観たい",
      pos: "動詞",
      base: "観る",
      reading: "みたい",
      pos2: "非自立可能",
      start: 6,
    },
    {
      text: "。",
      pos: "補助記号",
      base: "。",
      reading: "",
      pos2: "句点",
      start: 9,
    },
  ],
  tokenIdx: 3,
};

export const exampleMarkerData: MarkerData = {
  scanned: scanData,
  entry: scanData.dicEntries[0],
  selectedMeaning: scanData.dicEntries[0].senses[0],
};

export const exampleTranslatedSentence =
  "I want to watch an interesting movie.";
