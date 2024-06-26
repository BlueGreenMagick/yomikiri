import { type IBackend, TokenizeResult } from "../common/backend";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import { BrowserApi } from "extension/browserApi";

import Utils from "lib/utils";
import { loadDictionary, loadWasm } from "./fetch";

export * from "../common/backend";

export class DesktopBackend implements IBackend {
  wasm?: BackendWasm;
  browserApi: BrowserApi;

  static async initialize(browserApi: BrowserApi): Promise<DesktopBackend> {
    const backend = new DesktopBackend(browserApi);
    if (browserApi.context === "background") {
      await backend._initialize();
    }
    return backend;
  }

  private constructor(browserApi: BrowserApi) {
    this.browserApi = browserApi;
  }

  async _initialize(): Promise<void> {
    Utils.bench("start");
    const BackendWasmConstructorP = loadWasm();
    const dictionaryP = loadDictionary();
    const [BackendWasmConstructor, [indexBytes, entriesBytes]] =
      await Promise.all([BackendWasmConstructorP, dictionaryP]);
    Utils.bench("loaded");
    this.wasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    Utils.bench("backend created");
  }

  async tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    if (this.wasm === undefined) {
      return this.browserApi.request("tokenize", { text, charAt });
    } else {
      return this._tokenize(this.wasm, text, charAt);
    }
  }

  _tokenize(wasm: BackendWasm, text: string, charAt?: number): TokenizeResult {
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

  async search(term: string, charAt?: number): Promise<TokenizeResult> {
    if (this.wasm === undefined) {
      return this.browserApi.request("searchTerm", { term, charAt });
    } else {
      return this._search(this.wasm, term, charAt);
    }
  }

  _search(wasm: BackendWasm, term: string, charAt?: number): TokenizeResult {
    charAt = charAt ?? 0;
    if (term === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const codePointAt = Utils.toCodePointIndex(term, charAt);
    const rawResult = wasm.search(term, codePointAt);
    return TokenizeResult.from(rawResult);
  }
}

export const Backend = DesktopBackend;
export type Backend = DesktopBackend;
