import { Tokenizer as TokenizerInner, type Token } from "@platform/tokenizer";
import { Entry, type Dictionary } from "~/dictionary";
import Utils from "~/utils";

export type { Token } from "@platform/tokenizer";

export interface TokenizeRequest {
  text: string;
  selectedCharIdx: number;
}

export interface TokenizeResult {
  tokens: Token[];
  selectedTokenIdx: number;
  selectedTokenStartCharIdx: number;
  selectedTokenEndCharIdx: number;
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

  async tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
    Utils.benchStart();
    let tokens = await this.tokenizer.tokenize(req.text);
    Utils.bench("tokenize");
    this.joinAllTokens(tokens);
    Utils.bench("joinTokens");

    if (req.selectedCharIdx < 0 || req.selectedCharIdx >= req.text.length) {
      throw new RangeError(
        `selectedCharIdx is out of range: ${req.selectedCharIdx}, ${req.text}`
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
    const entry = await this.dictionary.search(tokens[tokenIdx].baseForm);
    Utils.bench("finish tokenize");
    return {
      tokens,
      selectedTokenStartCharIdx: startIdx,
      selectedTokenEndCharIdx: endIdx,
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
    let [token, count] = await this.joinCompounds(tokens, index);
    if (count > 1) {
      tokens.splice(index, count, token);
    }
    [token, count] = joinInflections(tokens, index);
    if (count > 1) {
      tokens.splice(index, count, token);
    }
  }

  /// Find maximal joined expression token starting from tokens[index]
  /// return [joined token, number of tokens joined]
  /// If such doesn't exist, return [tokens[index], 1]
  async joinCompounds(
    tokens: Token[],
    index: number
  ): Promise<[Token, number]> {
    let to: number;
    for (to = index + 2; to < tokens.length; to++) {
      let search = "";
      for (let i = index; i < to - 1; i++) {
        search += tokens[i].text;
      }
      search += tokens[to - 1].baseForm;
      let found: boolean;
      if (
        to - index === 2 &&
        (tokens[index].partOfSpeech === "接頭詞" ||
          tokens[to - 1].pos2 === "接尾")
      ) {
        found = await this.dictionary.hasStartsWith(search);
      } else {
        found = await this.dictionary.hasStartsWith(search, Entry.isExpression);
      }
      if (!found) {
        break;
      }
    }

    const joined = joinTokens(tokens, index, to - 1);
    return [joined, to - index - 1];
  }

  async tests() {
    await Promise.all([
      this.testTokenization("私/は/学生/です"),
      this.testTokenization("この/本/は/よく/じゃなかった"),
      // compound
      this.testTokenization("魚/フライ/を/食べた/かもしれない/猫"),
      this.testTokenization("地震/について/語る"),
      //this.testTokenization("聞こえて/き/そうな/くらい"),
      this.testTokenization("だから/しませんでした"),
      this.testTokenization("奇跡的/に/生まれました"),
      // prefix compound
      this.testTokenization("全否定"),
      // don't compound
      // this.testTokenization("私/は/しる"),
    ]);
  }

  /** expected: text token-separated with '/'. */
  async testTokenization(expected: string) {
    const text = expected.replace(/\//g, "");
    const result = await this.tokenize({ text, selectedCharIdx: 0 });
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

/// count must be bigger than 1
function joinTokens(tokens: Token[], from: number, to: number): Token {
  if (to - from === 1) {
    return tokens[from];
  }

  let text = "";
  let reading = "";
  for (let i = from; i < to - 1; i++) {
    text += tokens[i].text;
    reading += tokens[i].reading;
  }
  let baseForm = text + tokens[to - 1].baseForm;
  text += tokens[to - 1].text;
  reading += tokens[to - 1].reading;

  return {
    text,
    baseForm,
    reading,
    partOfSpeech: "=exp=",
    pos2: "*",
  };
}

/**  returns [combined token, number of joined tokens] */
function joinInflections(tokens: Token[], index: number): [Token, number] {
  let to = index + 1;
  let token = tokens[index];
  if (["動詞", "形容詞", "副詞", "=exp="].includes(token.partOfSpeech)) {
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
