import {
  type IBackend,
  TokenizeResult,
} from "../common/backend";
import initWasm from "@yomikiri/yomikiri-rs";
import ENYomikiridict from "@yomikiri/jmdict/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/jmdict/english.yomikiriindex";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";
import { BrowserApi } from "~/extension/browserApi";
import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm"
import Utils from "~/utils";

export {
  type Token,
  type TokenizeRequest,
  TokenizeResult,
} from "../common/backend";

async function loadWasm(): Promise<typeof BackendWasm> {
  // @ts-ignore wasm is string
  const resp = await fetch(wasm);
  await initWasm(resp);

  return BackendWasm;
}


async function fetchBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  const buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer, 0, buffer.byteLength);
}


export namespace Backend {
  let _wasm: BackendWasm;

  export async function initialize(): Promise<void> {
    if (BrowserApi.context === "background") {
      return _initialize()
    }
  }

  async function _initialize(): Promise<void> {
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
    _wasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    Utils.bench("backend")
  }

  export async function tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    if (BrowserApi.context !== "background") {
      return BrowserApi.request("tokenize", { text, charAt });
    } else {
      return _tokenize(text, charAt);
    }
  }

  async function _tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const codePointAt = Utils.toCodePointIndex(text, charAt);

    let rawResult = _wasm.tokenize(text, codePointAt);
    return TokenizeResult.from(rawResult);
  }

  export async function search(term: string): Promise<Entry[]> {
    if (BrowserApi.context !== "background") {
      return BrowserApi.request("searchTerm", term);
    } else {
      return _search(term);
    }
  }

  async function _search(term: string): Promise<Entry[]> {
    const entries = _wasm
      .search(term)
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
    Entry.order(entries);
    return entries;
  }

}


Backend satisfies IBackend;
