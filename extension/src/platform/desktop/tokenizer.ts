import type { ITokenizerStatic, ITokenizer } from "../types/tokenizer";

import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm.gz";
import initWasm from "@yomikiri/yomikiri-rs";
import { Tokenizer as TokenizerWasm, type Token } from "@yomikiri/yomikiri-rs";
import pako from "pako";

export type { Token } from "@yomikiri/yomikiri-rs";

async function loadWasm(): Promise<typeof TokenizerWasm> {
  // @ts-ignore wasm is string
  const resp = await fetch(wasm);
  const data = await resp.arrayBuffer();
  const uncompressed = pako.ungzip(data);
  await initWasm(uncompressed);

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
