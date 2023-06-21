import type { Token } from "~/tokenizer";
import Utils from "./utils";

export interface RubyUnit {
  base: string;
  ruby?: string;
}

export type RubyString = RubyUnit[];

const RE_HIRAGANA = /[\u3041-\u309F]/u;
const RE_KATAKANA = /[\u30A0-\u30FF]/u;
const RE_KANJI = /[\u4e00-\u9faf]/u;
const RE_NOKANJI = /[^\u4e00-\u9faf]/u;

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
    let inKatakana = isKatakana(reading);
    const splitted = splitKanjiKana(text);
    let regexp = "";
    if (splitted[0] !== "") {
      regexp += "(.+)";
    }
    // Should written kana be converted to hiragana/katakana based on reading?
    for (let i = 1; i < splitted.length; i++) {
      regexp +=
        i % 2 === 0
          ? "(.+)"
          : inKatakana
          ? toKatakana(splitted[i])
          : toHiragana(splitted[i]);
    }
    const r = new RegExp("^" + regexp + "$", "u");
    const matches = reading.match(r);

    let rubyString: RubyString = [];
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
        if (ankiString !== "" && ankiString[ankiString.length - 1] !== ">") {
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
 * first element of splitted is always kanji.
 * If text starts with kana, first element is ""
 */
function splitKanjiKana(text: string): string[] {
  const splitted = [];
  let isKanji = true;
  let chars = "";
  for (const char of text) {
    const regexp = isKanji ? RE_KANJI : RE_NOKANJI;
    if (regexp.test(char)) {
      chars += char;
    } else {
      splitted.push(chars);
      isKanji = !isKanji;
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

// (u+30a1ァ -> u+3041ぁ) (u+30f6ヶ -> u+3096ゖ)
// charcode: u+30a1 = 12449, u+30f6 = 12534, (-96)
/**
 * Convert all katakana to hiragana
 * `katakana` should be normalized
 */
export function toHiragana(katakana: string): string {
  let hiragana = "";
  for (let i = 0; i < katakana.length; i++) {
    const char = katakana.charCodeAt(i);
    if (char >= 12449 && char <= 12534) {
      hiragana += String.fromCharCode(char - 96);
    } else {
      hiragana += katakana[i];
    }
  }
  return hiragana;
}

/**
 * Convert all hiragana to katakana.
 * `hiragana` should be normalized.
 */
export function toKatakana(hiragana: string): string {
  let katakana = "";
  for (let i = 0; i < hiragana.length; i++) {
    const char = hiragana.charCodeAt(i);
    if (char >= 12353 && char <= 12438) {
      katakana += String.fromCharCode(char + 96);
    } else {
      katakana += hiragana[i];
    }
  }
  return katakana;
}
