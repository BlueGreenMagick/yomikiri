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
  // e.g. [読,み,切,り] => "よみきり".match(/(\w+)み(\w+)り/)
  /**
   * Generate furigana from kanji and its reading.
   * What if part of kanji is in katakana, but reading in hiragana?
   * kanji and reading should be normalized
   *
   */
  export function generate(text: string, reading: string): RubyString {
    const splitted = splitKanjiKana(text);
    let regexp = "";
    if (splitted[0] !== "") {
      regexp += "(\\w+)";
    }
    for (let i = 1; i < splitted.length; i++) {
      regexp += i % 2 === 0 ? "(\\w+)" : splitted[i];
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
      if (splitted[0] !== "") {
        rubyString.push({
          base: splitted[0],
          ruby: matches[1],
        });
      }
      for (let i = 1; i < splitted.length; i++) {
        rubyString.push({
          base: splitted[i],
          ruby: i % 2 === 0 ? matches[i / 2 + 1] : undefined,
        });
      }
    }

    return rubyString;
  }

  export function toAnki(rubyString: RubyString): string {
    let ankiString = "";
    for (const unit of rubyString) {
      if (unit.ruby === undefined) {
        ankiString += unit.base;
      } else {
        if (ankiString !== "") {
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
  return splitted;
}
