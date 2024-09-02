import type { AnkiBuilderData } from "lib/anki";
import type { TokenizeResult } from "@platform/backend";

const tokenized: TokenizeResult = {
  tokens: [
    {
      text: "面白い",
      start: 0,
      children: [],
      pos: "形容詞",
      pos2: "一般",
      base: "面白い",
      reading: "おもしろい",
      conjugation: "連体形-一般",
    },
    {
      text: "映画",
      start: 3,
      children: [],
      pos: "名詞",
      pos2: "普通名詞",
      base: "映画",
      reading: "えいが",
      conjugation: "*",
    },
    {
      text: "を",
      start: 5,
      children: [],
      pos: "助詞",
      pos2: "格助詞",
      base: "を",
      reading: "を",
      conjugation: "*",
    },
    {
      text: "見たい",
      start: 6,
      children: [
        {
          text: "見",
          start: 6,
          children: [],
          pos: "動詞",
          pos2: "非自立可能",
          base: "見る",
          reading: "ミ",
          conjugation: "連用形-一般",
        },
        {
          text: "たい",
          start: 7,
          children: [],
          pos: "助動詞",
          pos2: "*",
          base: "たい",
          reading: "タイ",
          conjugation: "連体形-一般",
        },
      ],
      pos: "動詞",
      pos2: "*",
      base: "見る",
      reading: "みたい",
      conjugation: "*",
    },
    {
      text: "。",
      start: 9,
      children: [],
      pos: "UNK",
      pos2: "*",
      base: "",
      reading: "。",
      conjugation: "*",
    },
  ],
  tokenIdx: 0,
  entries: [
    {
      id: 1533580,
      kanjis: [
        {
          kanji: "面白い",
          rarity: "Normal",
        },
      ],
      readings: [
        {
          reading: "おもしろい",
          nokanji: false,
          rarity: "Normal",
          toKanji: [],
        },
      ],
      grouped_senses: [
        {
          part_of_speech: ["adjective"],
          senses: [
            {
              toKanji: [],
              toReading: [],
              misc: [],
              info: [],
              dialects: [],
              meanings: [
                "interesting",
                "fascinating",
                "intriguing",
                "enthralling",
              ],
            },
            {
              toKanji: [],
              toReading: [],
              misc: [],
              info: [],
              dialects: [],
              meanings: ["amusing", "funny", "comical"],
            },
            {
              toKanji: [],
              toReading: [],
              misc: [],
              info: [],
              dialects: [],
              meanings: [
                "enjoyable",
                "fun",
                "entertaining",
                "pleasant",
                "agreeable",
              ],
            },
            {
              toKanji: [],
              toReading: [],
              misc: [],
              info: ["usu. in the negative"],
              dialects: [],
              meanings: [
                "good",
                "satisfactory",
                "favourable",
                "desirable",
                "encouraging",
              ],
            },
          ],
        },
      ],
      priority: 156,
    },
  ],
  grammars: [],
};

export const exampleMarkerData: AnkiBuilderData = {
  tokenized,
  entry: tokenized.entries[0],
  sentence: tokenized.tokens.map((tok) => tok.text).join(""),
  url: "https://yomikiri.example/",
  pageTitle: "Yomikiri Examples",
};

export const exampleTranslatedSentence =
  "I want to watch an interesting movie.";
