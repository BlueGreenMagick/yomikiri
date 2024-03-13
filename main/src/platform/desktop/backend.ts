import {
  type IBackend,
  TokenizeResult,
} from "../common/backend";
import initWasm from "@yomikiri/yomikiri-rs";
import ENYomikiridict from "@yomikiri/dictionary/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/dictionary/english.yomikiriindex";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";
import { BrowserApi } from "~/extension/browserApi";
import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm"
import Utils from "~/utils";
import { Dictionary } from "./dictionary"

export {
  type Token,
  type TokenizeRequest,
  TokenizeResult,
} from "../common/backend";


export namespace Backend {
  let _wasm: BackendWasm;

  export async function initialize(): Promise<void> {
    if (BrowserApi.context === "background") {
      return _initialize()
    }
  }

  async function _initialize(): Promise<void> {
    Utils.bench("start")
    const BackendWasmConstructorP = loadWasm();
    const dictionaryP = loadDictionary();
    const [BackendWasmConstructor, [indexBytes, entriesBytes]] = await Promise.all([BackendWasmConstructorP, dictionaryP]);
    Utils.bench("loaded")
    _wasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    Utils.bench("backend created")
  }

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

  async function loadDictionary(): Promise<[Uint8Array, Uint8Array]> {
    const saved = await Dictionary.loadSavedDictionary();
    if (saved !== null) {
      return saved;
    }

    const defaultIndexP = fetchBytes(ENYomikiriIndex);
    const defaultEntriesP = fetchBytes(ENYomikiridict);
    const [indexBytes, entriesBytes] = await Promise.all([
      defaultIndexP,
      defaultEntriesP,
    ]);
    return [indexBytes, entriesBytes];
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
