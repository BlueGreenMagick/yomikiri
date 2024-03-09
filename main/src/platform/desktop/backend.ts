import {
  type IBackendControllerStatic as IBackendControllerStatic,
  type IBackendController as IBackendController,
  TokenizeResult,
} from "../common/backend";
import initWasm from "@yomikiri/yomikiri-rs";
import ENYomikiridict from "@yomikiri/jmdict/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/jmdict/english.yomikiriindex";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";
import { BrowserApi } from "~/extension/browserApi";
import { toHiragana } from "~/japanese";
import Chunk0 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.0.chunk"
import Chunk1 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.1.chunk"
import Chunk2 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.2.chunk"
import Chunk3 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.3.chunk"
import Chunk4 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.4.chunk"
import Chunk5 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.5.chunk"
import Chunk6 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.6.chunk"
import Chunk7 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.7.chunk"
import Chunk8 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.8.chunk"
import Chunk9 from "@yomikiri/yomikiri-rs/chunks/yomikiri_rs_bg.wasm.9.chunk"
import Utils from "~/utils";

export {
  type Token,
  type TokenizeRequest,
  TokenizeResult,
} from "../common/backend";

async function loadWasm(): Promise<typeof BackendWasm> {
  // @ts-ignore wasm is string
  const wasmChunks: string[] = [Chunk0, Chunk1, Chunk2, Chunk3, Chunk4, Chunk5, Chunk6, Chunk7, Chunk8, Chunk9];

  let current = 0;
  const fetched = await fetch(wasmChunks[current]);
  let reader = (fetched.body as ReadableStream<Uint8Array>).getReader()

  const wasmStream = new ReadableStream(
    {
      pull: async (controller) => {
        let { done, value } = await reader.read();
        if (done) {
          current += 1;
          if (current == wasmChunks.length) {
            controller.close();
          }
          const fetched = await fetch(wasmChunks[current]);
          reader = (fetched.body as ReadableStream<Uint8Array>).getReader()
          value = (await reader.read()).value;
        }
        controller.enqueue(value);
      }
    }
  );
  const response = new Response(wasmStream, {
    headers: {
      'Content-Type': "application/wasm"
    }
  });
  await initWasm(response);

  return BackendWasm;
}

export class BackendController implements IBackendController {
  wasm: BackendWasm;

  /** May only be initialized in a 'background' webextension context */
  static async initialize(): Promise<BackendController> {
    if (BrowserApi.context !== "background") {
      throw new Error(
        "Desktop BackendController must be initialized in a 'background' context."
      );
    }
    Utils.bench("start")
    const BackendWasmConstructor = await loadWasm();
    Utils.bench("loadWasm")
    const indexBytesP = fetchBytes(ENYomikiriIndex);
    const entriesBytesP = fetchBytes(ENYomikiridict);
    const [indexBytes, entriesBytes] = await Promise.all([
      indexBytesP,
      entriesBytesP,
    ]);
    Utils.bench("fetch")
    const backendWasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    Utils.bench("backend")
    return new BackendController(backendWasm);
  }

  private constructor(wasm: BackendWasm) {
    this.wasm = wasm;
  }

  async tokenize(text: string, charAt: number): Promise<TokenizeResult> {
    let rawResult = this.wasm.tokenize(text, charAt);
    rawResult.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    return TokenizeResult.from(rawResult);
  }

  async search(term: string): Promise<Entry[]> {
    return this.wasm
      .search(term)
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
  }
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  const buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer, 0, buffer.byteLength);
}

BackendController satisfies IBackendControllerStatic;
