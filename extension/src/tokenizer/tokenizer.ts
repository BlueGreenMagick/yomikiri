import { Tokenizer as TokenizerInner, type Token } from "@platform/tokenizer";
import { Entry, type Dictionary } from "~/dictionary";

export type { Token } from "@yomikiri/tokenizer";

export interface TokenizeRequest {
  text: string;
  selectedCharIdx?: number;
}

export interface TokenizeResult {
  tokens: Token[];
  selectedTokenIdx?: number;
  selectedTokenStartCharIdx?: number;
  selectedTokenEndCharIdx?: number;
  selectedDicEntry?: Entry[];
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

  async tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
    let tokens = await this.tokenizer.tokenize(req.text);
    tokens = this.joinTokens(tokens);

    let result: TokenizeResult = { tokens };

    if (req.selectedCharIdx !== undefined) {
      if (req.selectedCharIdx < 0 || req.selectedCharIdx >= req.text.length) {
        throw new RangeError(
          `selectedCharIdx is out of range: ${req.selectedCharIdx}`
        );
      }
      let startIdx = 0;
      let endIdx = 0;
      let tokenIdx;
      for (tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
        startIdx = endIdx;
        endIdx = startIdx + tokens[tokenIdx].text.length;
        if (endIdx > req.selectedCharIdx) {
          break;
        }
      }
      const entry = this.dictionary.search(tokens[tokenIdx].baseForm);
      result = {
        ...result,
        selectedTokenStartCharIdx: startIdx,
        selectedTokenEndCharIdx: endIdx,
        selectedTokenIdx: tokenIdx,
        selectedDicEntry: entry,
      };
    }

    return result;
  }

  /// Try joining tokens if longer token exist in dictionary
  /// e.g. [込ん,で,いる] => 込んでいる
  private joinTokens(tokens: Token[]): Token[] {
    const joinedTokens: Token[] = [];
    let currentIndex = 0;
    while (currentIndex < tokens.length) {
      let [joined, count] = this.findJoinedToken(tokens, currentIndex);
      joinedTokens.push(joined);
      currentIndex += count;
    }
    return joinedTokens;
  }

  findJoinedToken(tokens: Token[], index: number): [Token, number] {
    let [t, n] = inflections(tokens, index);
    if (n > 1) {
      return [t, n];
    }
    [t, n] = this.compound(tokens, index);
    if (n > 1) {
      return [t, n];
    }
    return [tokens[index], 1];
  }

  /// Find maximal joined expression token starting from tokens[index]
  /// return [joined token, number of tokens joined]
  /// If such doesn't exist, return [tokens[index], 1]
  compound(tokens: Token[], index: number): [Token, number] {
    const MAXIMAL_FIND_LENGTH = 4;
    const initialTo = Math.min(tokens.length, index + MAXIMAL_FIND_LENGTH);
    // to = [index + 4 ..= index + 2]
    for (let to = initialTo; to > index + 1; to--) {
      let search = "";
      for (let i = index; i < to - 1; i++) {
        search += tokens[i].text;
      }
      search += tokens[to - 1].baseForm;
      const searched = this.dictionary.search(search);
      if (
        searched.length > 0 &&
        (tokens[index].partOfSpeech === "接頭辞" ||
          searched.find(Entry.isExpression))
      ) {
        const count = to - index;
        const joined = joinTokens(tokens, index, count);
        return [joined, count];
      }
    }
    return [tokens[index], 1];
  }

  async tests() {
    await Promise.all([
      this.testTokenization("私/は/学生/です"),
      this.testTokenization("この/本/は/よくじゃ/なかった"),
      // compound
      this.testTokenization("魚/フライ/を/食べた/かもしれない/ペルシア/猫"),
      this.testTokenization("地震/について/語る"),
      this.testTokenization("聞こえて/き/そうな/くらい"),
      this.testTokenization("だから/しませんでした"),
      // prefix compound
      this.testTokenization("全否定"),
      // don't compound
      this.testTokenization("私/は/しる"),
    ]);
  }

  /** expected: text token-separated with '/'. */
  async testTokenization(expected: string) {
    const text = expected.replace(/\//g, "");
    const result = await this.tokenize({ text });
    const tokens = result.tokens;
    const joinedTokens = tokens.map((v) => v.text).join("/");
    if (joinedTokens !== expected) {
      console.log(result);
      throw new Error(`Expected ${expected}, got ${joinedTokens}`);
    }
  }

  private constructor(dictionary: Dictionary, tokenizer: TokenizerInner) {
    this.dictionary = dictionary;
    this.tokenizer = tokenizer;
  }
}

function extendToken(t: Token, other: Token): Token {
  return {
    text: t.text + other.text,
    baseForm: t.text + other.baseForm,
    reading: t.reading + other.reading,
    partOfSpeech: "exp",
    pos2: "*",
  };
}

/// count must be bigger than 1
function joinTokens(tokens: Token[], index: number, count: number): Token {
  if (count === 1) {
    return tokens[index];
  }
  let current = tokens[index];
  for (let i = index + 1; i < index + count; i++) {
    current = extendToken(current, tokens[i]);
  }
  return current;
}

/**  returns [combined token, number of joined tokens] */
function inflections(tokens: Token[], index: number): [Token, number] {
  let to = index + 1;
  let token = tokens[index];
  if (["動詞", "形容詞", "形状詞", "副詞"].includes(token.partOfSpeech)) {
    let combined = token.text;
    while (
      to < tokens.length &&
      (tokens[to].partOfSpeech === "助動詞" || tokens[to].pos2 === "接続助詞")
    ) {
      combined += tokens[to].text;
      to += 1;
    }
    if (to - index > 1) {
      token = {
        ...token,
        text: combined,
      };
    }
  }
  return [token, to - index];
}
