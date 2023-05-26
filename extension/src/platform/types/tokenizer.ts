import type { Token } from "@yomikiri/tokenizer";

export interface ITokenizer {
  tokenize(text: string): Promise<Token[]>;
}

export interface ITokenizerStatic {
  initialize(): Promise<ITokenizer>;
}
