import { Tokenizer as TokenizerInner, type Token } from "@platform/tokenizer";
import type { Dictionary } from "~/dictionary";
import { Entry, Sense } from "./dicEntry";
import Utils from "~/utils";
import { toHiragana } from "./japanese";

export type { Token } from "@platform/tokenizer";

export interface TokenizeRequest {
  text: string;
  selectedCharIdx: number;
}

export interface TokenizeResult {
  tokens: Token[];
  selectedTokenIdx: number;
  selectedDicEntry: Entry[];
}

export class Tokenizer {
  dictionary: Dictionary;
  tokenizer: TokenizerInner;

  /// load wasm and initialize
  static async initialize(
    dictionaryPromise: Promise<Dictionary>
  ): Promise<Tokenizer> {
    const [tokenizerInner, dictionary] = await Promise.all([
      TokenizerInner.initialize(),
      dictionaryPromise,
    ]);
    return new Tokenizer(dictionary, tokenizerInner);
  }

  async tokenizeText(text: string): Promise<TokenizeResult> {
    return await this.tokenize({ text, selectedCharIdx: 0 });
  }

  async tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
    if (req.selectedCharIdx < 0 || req.selectedCharIdx >= req.text.length) {
      throw new RangeError(
        `selectedCharIdx is out of range: ${req.selectedCharIdx}, ${req.text}`
      );
    }
    Utils.benchStart();
    let tokens = await this.tokenizer.tokenize(req.text);
    tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    Utils.bench("tokenize");
    await this.joinAllTokens(tokens);
    Utils.bench("joinTokens");

    let tokenIdx =
      tokens.findIndex((token) => token.start > req.selectedCharIdx) - 1;
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
    await this.joinPrefix(tokens, index);
    await this.joinCompoundsMulti(tokens, index);
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
      }

      const joinedText = joinedTextPrev + tokens[to].text;
      const found = await this.dictionary.search(joinedText, filter);
      if (found.length > 0) {
        lastFoundTo = to + 1;
        lastFoundIsBase = false;
      }

      const foundNext = await this.dictionary.hasStartsWith(joinedText, filter);
      if (foundNext === false) {
        joinTokens(tokens, from, lastFoundTo, lastFoundIsBase);
        return lastFoundTo - from > 1;
      }

      joinedTextPrev = joinedText;
      to += 1;
    }

    joinTokens(tokens, from, to, false);
    return to - from > 1;
  }

  /** (接頭詞) (any) => (any) */
  private async joinPrefix(tokens: Token[], from: number) {
    if (from + 1 >= tokens.length) {
      return false;
    }
    const token = tokens[from];
    if (token.partOfSpeech !== "接頭辞") return false;

    const nextToken = tokens[from + 1];
    const compound = token.text + nextToken.baseForm;
    const search = await this.dictionary.search(compound);
    if (search.length === 0) return false;

    joinTokens(tokens, from, from + 2, true);
    return true;
  }

  /**
   * (any) (接尾辞) => (any)
   */
  private async joinSuffix(tokens: Token[], from: number) {
    if (from + 1 >= tokens.length) {
      return false;
    }
    const nextToken = tokens[from + 1];
    if (nextToken.partOfSpeech !== "接尾辞") return;

    const token = tokens[from];
    const compound = token.text + nextToken.baseForm;
    const search = await this.dictionary.search(compound);
    if (search.length === 0) return false;

    joinTokens(tokens, from, from + 2, true);
    return true;
  }

  private constructor(dictionary: Dictionary, tokenizer: TokenizerInner) {
    this.dictionary = dictionary;
    this.tokenizer = tokenizer;
  }
}

/** Splice and join tokens[from..<to], and return joined */
function joinTokens(
  tokens: Token[],
  from: number,
  to: number,
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
    partOfSpeech: "=exp=",
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
