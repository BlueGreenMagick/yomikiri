import { Backend, type Token } from "@platform/backend";
import type { Dictionary } from "~/dictionary";
import { Entry, Sense } from "./dicEntry";
import Utils from "~/utils";
import { toHiragana } from "./japanese";

export type { Token } from "@platform/backend";

export interface TokenizeRequest {
  text: string;
  charIdx: number;
}

export interface TokenizeResult {
  tokens: Token[];
  selectedTokenIdx: number;
  selectedDicEntry: Entry[];
}

export class Tokenizer {
  dictionary: Dictionary;
  tokenizer: Backend;

  /// load wasm and initialize
  static async initialize(
    dictionaryPromise: Promise<Dictionary>
  ): Promise<Tokenizer> {
    const [tokenizerInner, dictionary] = await Promise.all([
      Backend.initialize(),
      dictionaryPromise,
    ]);
    return new Tokenizer(dictionary, tokenizerInner);
  }

  async tokenizeText(text: string): Promise<TokenizeResult> {
    return await this.tokenize({ text, charIdx: 0 });
  }

  async tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
    if (req.charIdx < 0 || req.charIdx >= req.text.length) {
      throw new RangeError(
        `selectedCharIdx is out of range: ${req.charIdx}, ${req.text}`
      );
    }
    Utils.benchStart();
    let tokens = await this.tokenizer.tokenize(req.text, req.charIdx);
    tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    manualPatches(tokens);
    Utils.bench("tokenize");
    await this.joinAllTokens(tokens);
    Utils.bench("joinTokens");

    let tokenIdx = tokens.findIndex((token) => token.start > req.charIdx) - 1;
    tokenIdx = tokenIdx === -2 ? tokens.length - 1 : tokenIdx;

    const entry = await this.dictionary.search(tokens[tokenIdx].baseForm);
    Utils.bench("finish tokenize");
    return {
      tokens,
      selectedTokenIdx: tokenIdx,
      selectedDicEntry: entry,
    };
  }

  /// Join tokens in-place if longer token exist in dictionary
  /// e.g. [込ん,で,いる] => 込んでいる
  private async joinAllTokens(tokens: Token[]) {
    for (let i = 0; i < tokens.length; i++) {
      await this.joinTokensAt(tokens, i);
    }
  }

  async joinTokensAt(tokens: Token[], index: number) {
    await this.joinCompoundsMulti(tokens, index);
    await this.joinPrefix(tokens, index);
    await this.joinPreNoun(tokens, index);
    await this.joinConjunction(tokens, index);
    await this.joinSuffix(tokens, index);
    joinInflections(tokens, index);
  }

  /**
   * Join maximal expression tokens starting from tokens[index]
   *
   * Handles cases:
   *   1. (any)+ => (expression)
   *   2. (名詞)+ => (名詞)
   *   3. (助詞)+ => (助詞) e.g.　「かも」、「では」
   */
  private async joinCompoundsMulti(
    tokens: Token[],
    from: number
  ): Promise<boolean> {
    const token = tokens[from];
    let allNoun = token.partOfSpeech === "名詞";
    let allParticle = token.partOfSpeech === "助詞";

    let to = from + 1;
    let joinedTextPrev = tokens[from].text;

    let lastFoundTo = to;
    let lastFoundIsBase: boolean = true;
    let lastFoundPoS: string = token.partOfSpeech;

    const filter = (entry: Entry) => {
      return (
        Entry.isExpression(entry) ||
        (allNoun === true && Entry.isNoun(entry)) ||
        (allParticle === true && Entry.isParticle(entry))
      );
    };

    while (to < tokens.length) {
      const token = tokens[to];
      allNoun &&= token.partOfSpeech === "名詞";
      allParticle &&= token.partOfSpeech === "助詞";

      const joinedTextBase = joinedTextPrev + tokens[to].baseForm;
      const foundBase = await this.dictionary.search(joinedTextBase, filter);
      if (foundBase.length > 0) {
        lastFoundTo = to + 1;
        lastFoundIsBase = true;
        lastFoundPoS = allNoun ? "名詞" : allParticle ? "助詞" : "=exp=";
      }

      const joinedText = joinedTextPrev + tokens[to].text;
      const found = await this.dictionary.search(joinedText, filter);
      if (found.length > 0) {
        lastFoundTo = to + 1;
        lastFoundIsBase = false;
        lastFoundPoS = allNoun ? "名詞" : allParticle ? "助詞" : "=exp=";
      }

      const foundNext = await this.dictionary.hasStartsWith(joinedText, filter);
      if (foundNext === false) {
        joinTokens(tokens, from, lastFoundTo, lastFoundPoS, lastFoundIsBase);
        return lastFoundTo - from > 1;
      }

      joinedTextPrev = joinedText;
      to += 1;
    }

    joinTokens(tokens, from, to, lastFoundPoS, false);
    return to - from > 1;
  }

  /**
   * (接頭詞) (any) => (any)
   */
  private async joinPrefix(tokens: Token[], from: number): Promise<boolean> {
    if (from + 1 >= tokens.length) {
      return false;
    }
    const token = tokens[from];
    if (token.partOfSpeech !== "接頭辞") return false;

    const nextToken = tokens[from + 1];
    const compound = token.text + nextToken.baseForm;
    const search = await this.dictionary.search(compound);
    if (search.length === 0) return false;

    joinTokens(tokens, from, from + 2, nextToken.partOfSpeech, true);
    return true;
  }

  /** (連体詞) (名詞 | 代名詞 | 接頭辞) => (any) */
  private async joinPreNoun(tokens: Token[], from: number): Promise<boolean> {
    if (from + 1 >= tokens.length) {
      return false;
    }
    const token = tokens[from];
    if (token.partOfSpeech !== "連体詞") return false;
    const nextToken = tokens[from + 1];
    const nextPoS = nextToken.partOfSpeech;
    if (nextPoS !== "名詞" && nextPoS !== "代名詞" && nextPoS !== "接頭辞")
      return false;

    const compound = token.text + nextToken.baseForm;
    const search = await this.dictionary.search(compound);
    if (search.length === 0) return false;

    joinTokens(tokens, from, from + 2, nextToken.partOfSpeech, true);
    return true;
  }

  /**
   * (any) (接尾辞) => (any)　e.g. "この/間"
   */
  private async joinSuffix(tokens: Token[], from: number): Promise<boolean> {
    if (from + 1 >= tokens.length) {
      return false;
    }
    const nextToken = tokens[from + 1];
    if (nextToken.partOfSpeech !== "接尾辞") return false;

    const token = tokens[from];
    const compound = token.text + nextToken.baseForm;
    const search = await this.dictionary.search(compound);
    if (search.length === 0) return false;

    const poS2 = nextToken.pos2;
    let poS = token.partOfSpeech;
    if (poS2 === "名詞的") {
      poS = "名詞";
    } else if (poS2 === "形容詞的") {
      poS = "形容詞";
    } else if (poS2 === "動詞的") {
      poS = "動詞";
    } else if (poS2 === "形状詞") {
      poS = "形容";
    }
    joinTokens(tokens, from, from + 2, poS, true);
    return true;
  }

  /**
   * (any) (助詞) => conj
   *
   * Join any that ends with 助詞 because
   * unidic is not good at determining if a given 助詞 is 接続助詞
   */
  private async joinConjunction(
    tokens: Token[],
    from: number
  ): Promise<boolean> {
    if (from + 1 >= tokens.length) {
      return false;
    }
    const nextToken = tokens[from + 1];
    if (nextToken.partOfSpeech !== "助詞") return false;

    const token = tokens[from];
    const compound = token.text + nextToken.text;
    const search = await this.dictionary.search(compound, Entry.isConjunction);
    if (search.length === 0) return false;
    joinTokens(tokens, from, from + 2, "接続詞", false);
    return true;
  }

  private constructor(dictionary: Dictionary, tokenizer: Backend) {
    this.dictionary = dictionary;
    this.tokenizer = tokenizer;
  }
}

/** Splice and join tokens[from..<to], and return joined */
function joinTokens(
  tokens: Token[],
  from: number,
  to: number,
  poS: string = "=exp=",
  lastAsBase: boolean = true
): Token {
  if (to - from === 1) {
    return tokens[from];
  }

  let text = "";
  let reading = "";
  for (let i = from; i < to - 1; i++) {
    text += tokens[i].text;
    reading += tokens[i].reading;
  }

  let baseForm = text;
  if (lastAsBase === true) {
    baseForm += tokens[to - 1].baseForm;
  } else {
    baseForm += tokens[to - 1].text;
  }

  text += tokens[to - 1].text;
  reading += tokens[to - 1].reading;

  const joined = {
    text,
    baseForm,
    reading,
    partOfSpeech: poS,
    pos2: "*",
    start: tokens[from].start,
  };
  tokens.splice(from, to - from, joined);
  return joined;
}

/**  returns [combined token, number of joined tokens] */
function joinInflections(tokens: Token[], index: number): boolean {
  let to = index + 1;
  let token = tokens[index];
  if (
    ["動詞", "形容詞", "形状詞", "副詞", "=exp="].includes(token.partOfSpeech)
  ) {
    let joinedText = token.text;
    let joinedReading = token.reading;
    while (
      to < tokens.length &&
      (tokens[to].partOfSpeech === "助動詞" || tokens[to].pos2 === "接続助詞")
    ) {
      joinedText += tokens[to].text;
      joinedReading += tokens[to].reading;
      to += 1;
    }
    token = {
      ...token,
      text: joinedText,
      reading: joinedReading,
    };
  }

  if (to - index > 1) {
    tokens.splice(index, to - index, token);
    return true;
  } else {
    return false;
  }
}

function manualPatches(tokens: Token[]) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.text === "じゃ") {
      // "じゃない" 「じゃ」 -> 「じゃ」 instead of 「だ」
      tokens[i] = {
        text: "じゃ",
        baseForm: "じゃ",
        partOfSpeech: "接続詞",
        pos2: "*",
        reading: "ジャ",
        start: token.start,
      };
    } else if (token.text === "じゃあ") {
      // "じゃあ、" 「じゃあ」 -> 「じゃあ」, instead of 「で」
      tokens[i] = {
        text: "じゃあ",
        baseForm: "じゃあ",
        partOfSpeech: "接続詞",
        pos2: "*",
        reading: "ジャー",
        start: token.start,
      };
    }
  }
}
