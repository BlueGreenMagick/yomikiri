import type { ITokenizerStatic, ITokenizer } from "../types/tokenizer";
import Api from "~/api";
import type { Token } from "@yomikiri/tokenizer";

export type { Token } from "@yomikiri/tokenizer";

export class Tokenizer implements ITokenizer {
  static async initialize(): Promise<Tokenizer> {
    return new Tokenizer();
  }

  async tokenize(text: string): Promise<Token[]> {
    let result = await Api.requestToApp("tokenize", { text });
    return JSON.parse(result.tokens) as Token[];
  }
}

Tokenizer satisfies ITokenizerStatic;
