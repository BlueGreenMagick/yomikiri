import type { Token } from "@platform/backend";
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
 * \u31f0-\u31ff: katakana extension (ainu)
 * \u3220-\u32ff: Japanese symbol
 * \u3300-\u33ff: Japanese symbol
 * \u3400-\u4dbf: Rare hanji variant
 * \u4e00-\u9fff: kanji
 * \uf900-\ufaff: kanji
 * \ufe30-\ufe4f: rare Japanese punctuation
 * \uff00-\uff9f: halfwidth/fullwidth alphabet & punctuation
 *   - \uff60-\uff65: halfwidth katakana punctuation
 *   - \uff66-\uff9f: halfwidth katakana
 * \uffe0-\uffee: halfwidth/fullwidth symbols
 */
const RE_HIRAGANA = /[\u3041-\u309f]/u;
// including '゠', 'ー'
const RE_KATAKANA = /[\u30a0-\u30ff]/u;
const RE_KANJI = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
const RE_NOKANJI = /[^\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
// including symbols
const RE_JAPANESE_ALL =
  /[\u3000-\u30ff\u31f0-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff9f\uffe0-\uffee]/u;
// excluding most symbols or punctuations
const RE_JAPANESE_CONTENT =
  /[\u3040-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/u;

export namespace RubyString {
  // Some words are longer in kanji
  // https://japanese.stackexchange.com/questions/61993/are-there-any-words-that-are-longer-in-kanji-than-in-hiragana
  // 1. split kanji into blocks of pure kanji and kana.
  // 2. use regex to split reading into parts.
  // e.g. [読,み,切,り] => "よみきり".match(/(.+)み(.+)り/)
  // This might be inaccurate for long test
  /**
   * Generate furigana from text and its reading.
   * Assumes `text` and `reading` is normalized
   * Assumes `text` to not contain any regex special characters.
   * (No JMDict entry forms contains regex special characters)
   */
  export function generate(text: string, reading: string): RubyString {
    if (text === "") {
      return [];
    }
    if (reading === "" || reading === "*") {
      return [{ base: text }];
    }
    const inKatakana = isKatakana(reading);
    const splitted = splitKanjiSegment(text);
    let regexp = "";
    if (splitted[0] !== "") {
      regexp += "(.+?)";
    }
    // Should written kana be converted to hiragana/katakana based on reading?
    for (let i = 1; i < splitted.length; i++) {
      regexp +=
        i % 2 === 0
          ? "(.+?)"
          : inKatakana
            ? Utils.escapeRegex(toKatakana(splitted[i]))
            : Utils.escapeRegex(toHiragana(splitted[i]));
    }
    const r = new RegExp("^" + regexp + "$", "u");
    const matches = reading.match(r);

    const rubyString: RubyString = [];
    if (matches === null) {
      rubyString.push({
        base: text,
        ruby: reading,
      });
    } else {
      let first = 0;
      if (splitted[0] !== "") {
        rubyString.push({
          base: splitted[0],
          ruby: matches[1],
        });
        first = 1;
      }
      for (let i = 1; i < splitted.length; i++) {
        rubyString.push({
          base: splitted[i],
          ruby: i % 2 === 0 ? matches[i / 2 + first] : undefined,
        });
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
 * Returns an array of [kanji, non-kanji, kanji, ...].
 * 
 * If text starts with non-kanji, first element is "".
 */
function splitKanjiSegment(text: string): string[] {
  const splitted = [];
  let gettingKanji = true;
  let chars = "";
  for (const char of text) {
    if (RE_KANJI.test(char) === gettingKanji) {
      chars += char;
    } else {
      splitted.push(chars);
      gettingKanji = !gettingKanji;
      chars = char;
    }
  }
  splitted.push(chars);
  return splitted;
}

/** First char of text is hiragana. Return false if text is "" */
export function isHiragana(text: string): boolean {
  if (text === "") return false;
  const char = text.charCodeAt(0);
  return char >= 12353 && char <= 12438;
}

/** First char of text is hiragana. Return false if text is "" */
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
 * Convert all katakana in text to hiragana
 * `text` should be NFC normalized
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
 * `text` should be NFC normalized.
 * 
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
