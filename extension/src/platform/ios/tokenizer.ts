import type { ITokenizerStatic, ITokenizer, Token } from "../types/tokenizer";
import Api from "~/api";

export type { Token } from "../types/tokenizer";

export class Tokenizer implements ITokenizer {
  static async initialize(): Promise<Tokenizer> {
    return new Tokenizer();
  }

  async tokenize(text: string): Promise<Token[]> {
    return await Api.requestToApp("tokenize", text);
  }
}

Tokenizer satisfies ITokenizerStatic;
