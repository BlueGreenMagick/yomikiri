import type {
  IBackendStatic as IBackendStatic,
  IBackend as IBackend,
  TokenizeResult,
} from "../types/backend";
import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm";
import initWasm from "@yomikiri/yomikiri-rs";
import ENYomikiridict from "@yomikiri/dictionary/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/dictionary/english.yomikiriindex";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";

export type { Token, TokenizeRequest, TokenizeResult } from "../types/backend";

async function loadWasm(): Promise<typeof BackendWasm> {
  // @ts-ignore wasm is string
  const resp = await fetch(wasm);
  const data = await resp.arrayBuffer();
  await initWasm(data);

  return BackendWasm;
}

export class Backend implements IBackend {
  wasm: BackendWasm;

  static async initialize(): Promise<Backend> {
    const BackendWasmConstructor = await loadWasm();
    const indexBytesP = fetchBytes(ENYomikiriIndex);
    const entriesBytesP = fetchBytes(ENYomikiridict);
    const [indexBytes, entriesBytes] = await Promise.all([
      indexBytesP,
      entriesBytesP,
    ]);
    const backendWasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    return new Backend(backendWasm);
  }

  private constructor(wasm: BackendWasm) {
    this.wasm = wasm;
  }

  async tokenize(text: string, charAt: number): Promise<TokenizeResult> {
    let rawResult = this.wasm.tokenize(text, charAt);
    return {
      tokens: rawResult.tokens,
      tokenIdx: rawResult.tokenIdx,
      entries: rawResult.entriesJson
        .map((json) => JSON.parse(json))
        .map(Entry.fromObject),
    };
  }

  async tokenizeRaw(text: string, charIdx: number): Promise<TokenizeResult> {
    let rawResult = this.wasm.tokenize_raw(text, charIdx);
    return {
      tokens: rawResult.tokens,
      tokenIdx: rawResult.tokenIdx,
      entries: rawResult.entriesJson
        .map((json) => JSON.parse(json))
        .map(Entry.fromObject),
    };
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

Backend satisfies IBackendStatic;
