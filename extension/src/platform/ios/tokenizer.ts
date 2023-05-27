import type { ITokenizerStatic, ITokenizer } from "../types/tokenizer";
import Api from "~/api";
import type { Token } from "@yomikiri/tokenizer";

export type { Token } from "@yomikiri/tokenizer";

export class Tokenizer implements ITokenizer {
  static async initialize(): Promise<Tokenizer> {
    return new Tokenizer();
  }

  async tokenize(text: string): Promise<Token[]> {
    return await Api.requestToApp("tokenize", text);
  }
}

Tokenizer satisfies ITokenizerStatic;
