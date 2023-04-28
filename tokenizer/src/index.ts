import wasm from "@yomikiri/lindera-wasm/lindera_wasm_bg.wasm.gz";
import init from "@yomikiri/lindera-wasm";
import { Tokenizer, type Token } from "@yomikiri/lindera-wasm";
import pako from "pako";

export async function load(): Promise<typeof Tokenizer> {
  // @ts-ignore wasm is string
  const resp = await fetch(wasm);
  const data = await resp.arrayBuffer();
  const uncompressed = pako.ungzip(data);
  await init(uncompressed);

  return Tokenizer;
}

export type { Tokenizer, Token };
export default load;
