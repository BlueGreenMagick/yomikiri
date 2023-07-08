import type { ITokenizerStatic, ITokenizer, Token } from "../types/tokenizer";

import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm";
import initWasm from "@yomikiri/yomikiri-rs";
import { Tokenizer as TokenizerWasm } from "@yomikiri/yomikiri-rs";

export type { Token } from "../types/tokenizer";

async function loadWasm(): Promise<typeof TokenizerWasm> {
  // @ts-ignore wasm is string
  const resp = await fetch(wasm);
  const data = await resp.arrayBuffer();
  await initWasm(data);

  return TokenizerWasm;
}

export class Tokenizer implements ITokenizer {
  wasm: TokenizerWasm;

  static async initialize(): Promise<Tokenizer> {
    const TokenizerWasm = await loadWasm();
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
