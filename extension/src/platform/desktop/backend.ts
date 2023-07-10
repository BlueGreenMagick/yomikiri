import type {
  IBackendStatic as IBackendStatic,
  IBackend as IBackend,
  Token,
} from "../types/backend";

import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm";
import initWasm from "@yomikiri/yomikiri-rs";
import ENYomikiridict from "~/assets/jmdict/english.yomikiridict";
import ENYomikiriIndex from "~/assets/jmdict/english.yomikiriindex";

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
    Utils.bench("Start load wasm");
    const BackendWasmConstructor = await loadWasm();
    Utils.bench("Start fetch");
    const indexBytesP = fetchBytes(ENYomikiriIndex);
    const entriesBytesP = fetchBytes(ENYomikiridict);
    const [indexBytes, entriesBytes] = await Promise.all([
      indexBytesP,
      entriesBytesP,
    ]);
    Utils.bench("Start initialize backend");
    const backendWasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    Utils.bench("Finish");
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
