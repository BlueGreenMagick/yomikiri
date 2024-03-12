import { BrowserApi } from "~/extension/browserApi";
import { Platform } from ".";
import {
  type IBackend,
  type TokenizeRequest,
  TokenizeResult,
  type DictionaryMetadata,
} from "../common/backend";
import { Entry } from "~/dicEntry";

export {
  type Token,
  type TokenizeRequest,
  TokenizeResult,
  type DictionaryMetadata,
} from "../common/backend";


export namespace Backend {
  export async function initialize(): Promise<void> {
    return;
  }

  export async function tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    if (BrowserApi.context !== "contentScript") {
      return _tokenize(text, charAt);
    } else {
      return BrowserApi.request("tokenize", { text, charAt });
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

    let req: TokenizeRequest = { text, charAt };
    let rawResult = await Platform.requestToApp("tokenize", req);
    return TokenizeResult.from(rawResult);
  }

  export async function search(term: string): Promise<Entry[]> {
    if (BrowserApi.context !== "contentScript") {
      return _search(term);
    } else {
      return BrowserApi.request("searchTerm", term);
    }
  }

  async function _search(term: string): Promise<Entry[]> {
    const entries = (await Platform.requestToApp("search", term))
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
    Entry.order(entries);
    return entries;
  }

  export async function updateDictionary(): Promise<DictionaryMetadata> {
    throw new Error("Not implemented on ios");
  }

  export async function dictionaryMetadata(): Promise<DictionaryMetadata> {
    throw new Error("Not implemented on ios");
  }
}

Backend satisfies IBackend;