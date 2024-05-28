import { BrowserApi } from "extension/browserApi";
import { Platform as IosPlatform } from ".";
import {
  type IBackend,
  type TokenizeRequest,
  TokenizeResult,
} from "../common/backend";
import { Entry, type EntryObject } from "lib/dicEntry";

export * from "../common/backend";

export class IosBackend implements IBackend {
  platform: IosPlatform;
  browserApi: BrowserApi;

  constructor(platform: IosPlatform, browserApi: BrowserApi) {
    this.platform = platform;
    this.browserApi = browserApi;
  }

  async tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    if (this.browserApi.context !== "contentScript") {
      return this._tokenize(text, charAt);
    } else {
      return this.browserApi.request("tokenize", { text, charAt });
    }
  }

  async _tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const req: TokenizeRequest = { text, charAt };
    const rawResult = await this.platform.requestToApp("tokenize", req);
    return TokenizeResult.from(rawResult);
  }

  async search(term: string): Promise<Entry[]> {
    if (this.browserApi.context !== "contentScript") {
      return this._search(term);
    } else {
      return this.browserApi.request("searchTerm", term);
    }
  }

  async _search(term: string): Promise<Entry[]> {
    const entries = (await this.platform.requestToApp("search", term))
      .map((json) => JSON.parse(json) as EntryObject)
      .map(Entry.fromObject);
    Entry.order(entries);
    return entries;
  }
}

export const Backend = IosBackend;
export type Backend = IosBackend;
