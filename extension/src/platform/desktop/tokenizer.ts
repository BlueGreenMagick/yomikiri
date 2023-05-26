import type { ITokenizerStatic, ITokenizer } from "../types/tokenizer";
import loadTokenizerWasm, {
  type Token,
  type Tokenizer as TokenizerWasm,
} from "@yomikiri/tokenizer";

export type { Token } from "@yomikiri/tokenizer";

export class Tokenizer implements ITokenizer {
  wasm: TokenizerWasm;

  static async initialize(): Promise<Tokenizer> {
    const TokenizerWasm = await loadTokenizerWasm();
    const tokenizerWasm = new TokenizerWasm();
    return new Tokenizer(tokenizerWasm);
  }

  private constructor(wasm: TokenizerWasm) {
    this.wasm = wasm;
  }

  async tokenize(text: string): Promise<Token[]> {
    return this.wasm.tokenize(text);
  }
}

Tokenizer satisfies ITokenizerStatic;
