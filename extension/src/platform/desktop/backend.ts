import type {
  IBackendStatic as IBackendStatic,
  IBackend as IBackend,
  Token,
} from "../types/backend";

import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm";
import initWasm from "@yomikiri/yomikiri-rs";
import ENYomikiridict from "@yomikiri/dictionary/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/dictionary/english.yomikiriindex";

import { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import Utils from "~/utils";

export type { Token } from "../types/backend";

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

  async tokenize(text: string, charIdx: number): Promise<Token[]> {
    return this.wasm.tokenize(text, charIdx);
  }
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  const buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer, 0, buffer.byteLength);
}

Backend satisfies IBackendStatic;
