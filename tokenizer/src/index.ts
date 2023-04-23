import wasm from "@yomikiri/lindera-wasm/lindera_wasm_bg.wasm";
import init from "@yomikiri/lindera-wasm";
import { Tokenizer, type Token } from "@yomikiri/lindera-wasm";

export async function load(): Promise<typeof Tokenizer> {
  await init(wasm);

  return Tokenizer;
}

export type { Tokenizer, Token };
export default load;
