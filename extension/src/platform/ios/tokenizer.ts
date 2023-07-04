import { Platform } from ".";
import type { ITokenizerStatic, ITokenizer, Token } from "../types/tokenizer";

export type { Token } from "../types/tokenizer";

export class Tokenizer implements ITokenizer {
  static async initialize(): Promise<Tokenizer> {
    return new Tokenizer();
  }

  async tokenize(text: string): Promise<Token[]> {
    return await Platform.requestToApp("tokenize", text);
  }
}

Tokenizer satisfies ITokenizerStatic;
