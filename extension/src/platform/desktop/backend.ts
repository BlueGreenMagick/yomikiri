import type {
  IBackendControllerStatic as IBackendControllerStatic,
  IBackendController as IBackendController,
  TokenizeResult,
} from "../types/backend";
import wasm from "@yomikiri/yomikiri-rs/yomikiri_rs_bg.wasm";
import initWasm from "@yomikiri/yomikiri-rs";
import ENYomikiridict from "@yomikiri/dictionary/english.yomikiridict";
import ENYomikiriIndex from "@yomikiri/dictionary/english.yomikiriindex";
import { Backend as BackendWasm } from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";
import { BrowserApi } from "~/browserApi";
import { toHiragana } from "~/japanese";

export type { Token, TokenizeRequest, TokenizeResult } from "../types/backend";

async function loadWasm(): Promise<typeof BackendWasm> {
  // @ts-ignore wasm is string
  const resp = await fetch(wasm);
  const data = await resp.arrayBuffer();
  await initWasm(data);

  return BackendWasm;
}

export class BackendController implements IBackendController {
  wasm: BackendWasm | null;

  static async initialize(): Promise<BackendController> {
    if (BrowserApi.context !== "background") {
      return new BackendController(null);
    }
    const BackendWasmConstructor = await loadWasm();
    const indexBytesP = fetchBytes(ENYomikiriIndex);
    const entriesBytesP = fetchBytes(ENYomikiridict);
    const [indexBytes, entriesBytes] = await Promise.all([
      indexBytesP,
      entriesBytesP,
    ]);
    const backendWasm = new BackendWasmConstructor(indexBytes, entriesBytes);
    return new BackendController(backendWasm);
  }

  private constructor(wasm: BackendWasm | null) {
    this.wasm = wasm;
  }

  async tokenize(text: string, charAt: number): Promise<TokenizeResult> {
    if (this.wasm === null) {
      return await BrowserApi.request("tokenize", { text, charAt });
    } else {
      let rawResult = this.wasm.tokenize(text, charAt);
      rawResult.tokens.forEach((token) => {
        const reading = token.reading === "*" ? token.text : token.reading;
        token.reading = toHiragana(reading);
      });
      return {
        tokens: rawResult.tokens,
        tokenIdx: rawResult.tokenIdx,
        entries: rawResult.entriesJson
          .map((json) => JSON.parse(json))
          .map(Entry.fromObject),
      };
    }
  }

  async tokenizeRaw(text: string, charAt: number): Promise<TokenizeResult> {
    if (this.wasm === null) {
      throw new Error(
        "This method may only be called in the background script"
      );
    }
    let rawResult = this.wasm.tokenize_raw(text, charAt);
    rawResult.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    return {
      tokens: rawResult.tokens,
      tokenIdx: rawResult.tokenIdx,
      entries: rawResult.entriesJson
        .map((json) => JSON.parse(json))
        .map(Entry.fromObject),
    };
  }

  async search(term: string): Promise<Entry[]> {
    if (this.wasm === null) {
      return await BrowserApi.request("searchTerm", term);
    }
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
