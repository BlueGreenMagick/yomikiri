import type { Token } from "@yomikiri/backend-bindings";
import Utils from "./utils";

export interface RubyUnit {
  base: string;
  ruby?: string;
}

export type RubyString = RubyUnit[];

/** Unicode Japanese character ranges:
 *
 * \u3000-\u303f: Japanese punctuation
 * \u3040-\u309f: hiragana
 * \u30a0-\u30ff: katakana
 * \u3190-\u319f: kanbun (historical annotation)
 * \u31f0-\u31ff: katakana extension (ainu small kana)
 * \u3200-\u32ff: CJK symbols (enclosed letters, months)
 *  - \u3220-\u325f, \u3280-\u32ff: Japanese / numeric
 * \u3300-\u33ff: Japanese symbol (kumimoji)
 *  - \u3300-\u337F, \u33e0-\u33ff: mostly Japanese
 * \u3400-\u4dbf: Rare hanji variant
 * \u4e00-\u9fff: kanji
 * \uf900-\ufaff: kanji
 * \ufe30-\ufe4f: rare Japanese punctuation
 * \uff00-\uffef: halfwidth/fullwidth alphabet & punctuation
 *   - \uff60-\uff65, \uff9e-\uff9f: halfwidth katakana punctuation
 *   - \uff66-\uff9d: halfwidth katakana
 */
const _RE_HIRAGANA = /[\u3041-\u309f]/u;
// including '゠', 'ー'
const _RE_KATAKANA = /[\u30a0-\u30ff]/u;
const RE_KANJI = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
const RE_NOKANJI = /[^\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

/**
 * Char range that triggers Yomikiri dictionary.
 *
 * It aims to only include Japanese kana and kanji, and exclude punctuations.
 * However, some exceptions are made for ease and perforamnce.
 */
const RE_JAPANESE_CONTENT =
  /[\u3040-\u30ff\u3190-\u319f\u31f0-\u31ff\u3220-\u325f\u3280-\u337f\u33e0-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9d]/u;

const RE_KANJI_SEGMENT_SPLIT = new RegExp(
  `(${RE_KANJI.source}*)(${RE_NOKANJI.source}*)`,
  "g",
);

export namespace RubyString {
  // Some words are longer in kanji
  // https://japanese.stackexchange.com/questions/61993/are-there-any-words-that-are-longer-in-kanji-than-in-hiragana
  // 1. split kanji into blocks of pure kanji and kana.
  // 2. use regex to split reading into parts.
  // e.g. [読,み,切,り] => "よみきり".match(/(.+)み(.+)り/)
  // This might be inaccurate for long texts

  /**
   * Generate furigana from text and its reading.
   * Assumes `text` and `reading` is normalized
   * Assumes `text` to not contain any regex special characters.
   * (No JMDict entry forms contains regex special characters)
   * Assumes `reading` to only contain hiragana and katakana
   *
   * Can match between hiragana and katakana. (e.g. 'あ' matches 'ア')
   */
  export function generate(text: string, reading?: string): RubyString {
    if (text === "") {
      return [];
    }
    if (
      reading === undefined ||
      reading === "" ||
      reading === "*" ||
      text === reading
    ) {
      return [{ base: text }];
    }

    const [kanjiSegs, noKanjiSegs] = splitKanjiSegments(text);
    let regexp = "";

    for (let i = 0; i < kanjiSegs.length; i++) {
      if (i != 0 || kanjiSegs[0] !== "") {
        regexp += "(.+?)";
      }
      regexp += Utils.escapeRegex(toHiragana(noKanjiSegs[i]));
    }
    const r = new RegExp("^" + regexp + "$");
    const matches = toHiragana(reading).match(r);

    const rubyString: RubyString = [];
    if (matches === null) {
      rubyString.push({
        base: text,
        ruby: reading,
      });
    } else {
      const start = kanjiSegs[0] === "" ? 0 : 1;
      for (let i = 0; i < kanjiSegs.length; i++) {
        if (i !== 0 || kanjiSegs[0] !== "") {
          rubyString.push({
            base: kanjiSegs[i],
            ruby: matches[i + start],
          });
        }
        // last nokanji segment may be empty
        if (noKanjiSegs[i] !== "") {
          rubyString.push({
            base: noKanjiSegs[i],
          });
        }
      }
    }

    return rubyString;
  }

  export function fromToken(token: Token): RubyString {
    return RubyString.generate(token.text, token.reading);
  }

  /** Ruby string in Anki furigana style `漢字[かんじ]`*/
  export function toAnki(rubyString: RubyString): string {
    let ankiString = "";
    for (const unit of rubyString) {
      if (unit.ruby === undefined) {
        ankiString += unit.base;
      } else {
        if (ankiString !== "" && !ankiString.endsWith(">")) {
          ankiString += " ";
        }
        ankiString += unit.base;
        ankiString += "[";
        ankiString += unit.ruby;
        ankiString += "]";
      }
    }
    return ankiString;
  }

  /** Ruby string in HTML: `<ruby>漢字<rt>かんじ</rt></ruby>`*/
  export function toHtml(rubyString: RubyString): string {
    let html = "";
    for (const unit of rubyString) {
      if (unit.ruby === undefined) {
        html += Utils.escapeHTML(unit.base);
      } else {
        const base = Utils.escapeHTML(unit.base);
        const ruby = Utils.escapeHTML(unit.ruby);
        html += `<ruby>${base}<rt>${ruby}</rt></ruby>`;
      }
    }
    return html;
  }
}

/**
 * Split text into kanji segments and non-kanji segments.
 *
 * Returns [kanji segments, non-kanji segments]
 * where text is [kanji[0], non-kanji[0], kanji[1], non-kanji[1], ...]
 *
 * If text starts with non-kanji, kanji[0] is "".
 */
function splitKanjiSegments(text: string): [string[], string[]] {
  const kanjis: string[] = [];
  const noKanjis: string[] = [];

  for (const match of text.matchAll(RE_KANJI_SEGMENT_SPLIT)) {
    if (match[0] === "") {
      break;
    }
    kanjis.push(match[1]);
    noKanjis.push(match[2]);
  }

  return [kanjis, noKanjis];
}

/**
 * First char of text is hiragana. Return false if text is ""
 *
 * Note that characters such as 'ゝ' or '゛' in hiragana unicode range returns false.
 * Only returns true for common hiraganas.
 */
export function isHiragana(text: string): boolean {
  if (text === "") return false;
  const char = text.charCodeAt(0);
  return char >= 12353 && char <= 12438;
}

/**
 * First char of text is hiragana. Return false if text is ""
 * Note that characters such as '゠', '・', 'ー', 'ヽ' in katakana unicode range returns false.
 * Only returns true for common katakanas.
 */
export function isKatakana(text: string): boolean {
  if (text === "") return false;
  const char = text.charCodeAt(0);
  return char >= 12449 && char <= 12534;
}

/**
 * Returns true if text contains japanese character(kana/kanji),
 * excluding most symbols and punctuations.
 */
export function containsJapaneseContent(text: string): boolean {
  return RE_JAPANESE_CONTENT.test(text);
}

// (u+30a1ァ -> u+3041ぁ) (u+30f6ヶ -> u+3096ゖ)
// charcode: u+30a1 = 12449, u+30f6 = 12534, (-96)
/**
 * Convert all katakana in text to hiragana.
 *
 * `text` should be NFC normalized.
 *
 * Note that 'ゝ' and 'ゞ' are not converted.
 */
export function toHiragana(text: string): string {
  let hiragana = "";
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    if (char >= 12449 && char <= 12534) {
      hiragana += String.fromCharCode(char - 96);
    } else {
      hiragana += text[i];
    }
  }
  return hiragana;
}

/**
 * Convert all hiragana in text to katakana.
 *
 * `text` should be NFC normalized.
 *
 * Note that 'ヽ' and 'ヾ' are not converted.
 */
export function toKatakana(text: string): string {
  let katakana = "";
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    if (char >= 12353 && char <= 12438) {
      katakana += String.fromCharCode(char + 96);
    } else {
      katakana += text[i];
    }
  }
  return katakana;
}

/** Returns a string that contains all kanji characters in text. */
export function extractKanjis(text: string): string {
  const re = new RegExp(RE_KANJI.source, "gu");
  const matches = text.matchAll(re);
  let kanjis = "";
  for (const match of matches) {
    kanjis += match[0];
  }
  return kanjis;
}
