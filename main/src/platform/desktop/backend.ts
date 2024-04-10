import {
  type IBackend,
  TokenizeResult,
} from "../common/backend";
import initWasm from "@yomikiri/yomikiri-rs";
import ENYomikiridict from "@yomikiri/dictionary/res/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/dictionary/res/english.yomikiriindex";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import { Entry, type EntryObject } from "~/dicEntry";
import { BrowserApi } from "~/extension/browserApi";
import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm"
import Utils from "~/utils";
import { Dictionary } from "./dictionary"

export * from "../common/backend";


class DesktopBackend implements IBackend {
  wasm?: BackendWasm
  browserApi: BrowserApi

  static async initialize(browserApi: BrowserApi): Promise<DesktopBackend> {
    const backend = new DesktopBackend(browserApi)
    if (browserApi.context === "background") {
      await backend._initialize()
    }
    return backend
  }

  private constructor(browserApi: BrowserApi) {
    this.browserApi = browserApi
  }

  async _initialize(): Promise<void> {
    Utils.bench("start")
    const BackendWasmConstructorP = loadWasm();
    const dictionaryP = this.loadDictionary();
    const [BackendWasmConstructor, [indexBytes, entriesBytes]] = await Promise.all([BackendWasmConstructorP, dictionaryP]);
    Utils.bench("loaded")
    this.wasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    Utils.bench("backend created")
  }

  async loadDictionary(): Promise<[Uint8Array, Uint8Array]> {
    const dictionary = new Dictionary()
    const saved = await dictionary.loadSavedDictionary();
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

  async tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    if (this.wasm === undefined) {
      return this.browserApi.request("tokenize", { text, charAt });
    } else {
      return this._tokenize(this.wasm, text, charAt);
    }
  }

  async _tokenize(wasm: BackendWasm, text: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const codePointAt = Utils.toCodePointIndex(text, charAt);

    const rawResult = wasm.tokenize(text, codePointAt);
    return TokenizeResult.from(rawResult);
  }

  async search(term: string): Promise<Entry[]> {
    if (this.wasm === undefined) {
      return this.browserApi.request("searchTerm", term);
    } else {
      return this._search(this.wasm, term);
    }
  }

  async _search(wasm: BackendWasm, term: string): Promise<Entry[]> {
    const entries = wasm
      .search(term)
      .map((json) => JSON.parse(json) as EntryObject)
      .map(Entry.fromObject);
    Entry.order(entries);
    return entries;
  }
}

async function loadWasm(): Promise<typeof BackendWasm> {
  // @ts-expect-error wasm is string
  const resp = await fetch(wasm);
  await initWasm(resp);

  return BackendWasm;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  const buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer, 0, buffer.byteLength);
}

export const Backend = DesktopBackend
export type Backend = DesktopBackend