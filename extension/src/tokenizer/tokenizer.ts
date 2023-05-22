import { Tokenizer as TokenizerInner, type Token } from "@platform/tokenizer";
import type { Dictionary } from "~/dictionary";

export type { Token } from "@yomikiri/tokenizer";

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

  async tokenize(input: string): Promise<Token[]> {
    let tokens = await this.tokenizer.tokenize(input);
    return this.joinTokens(tokens);
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

  /// Find maximal joined token starting from tokens[index]
  /// return [joined token, number of tokens joined]
  /// If such doesn't exist, return [tokens[index], 1]
  findJoinedToken(tokens: Token[], index: number): [Token, number] {
    const MAXIMAL_FIND_LENGTH = 4;
    const initialTo = Math.min(tokens.length, index + MAXIMAL_FIND_LENGTH);
    // to = [index + 4 ..= index + 2]
    for (let to = initialTo; to > index + 1; to--) {
      let search = "";
      for (let i = index; i < to - 1; i++) {
        search += tokens[i].text;
      }
      search += tokens[to - 1].baseForm;
      if (this.dictionary.search(search).length > 0) {
        const count = to - index;
        const joined = joinTokens(tokens, index, count);
        return [joined, count];
      }
    }
    return [tokens[index], 1];
  }

  private constructor(dictionary: Dictionary, tokenizer: TokenizerInner) {
    this.dictionary = dictionary;
    this.tokenizer = tokenizer;
  }
}

function extendToken(t: Token, other: Token): Token {
  let pos: string;
  if (t.partOfSpeech === other.partOfSpeech) {
    pos = t.partOfSpeech;
  } else if (other.partOfSpeech === "動詞") {
    pos = other.partOfSpeech;
  } else {
    pos = "UNK";
  }

  return {
    text: t.text + other.text,
    baseForm: t.text + other.baseForm,
    reading: t.reading + other.reading,
    partOfSpeech: pos,
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
