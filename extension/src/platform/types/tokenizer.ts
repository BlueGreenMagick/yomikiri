import type { Token } from "@yomikiri/yomikiri-rs";

export type { Token } from "@yomikiri/yomikiri-rs";

export interface ITokenizer {
  tokenize(text: string): Promise<Token[]>;
}

export interface ITokenizerStatic {
  initialize(): Promise<ITokenizer>;
}
