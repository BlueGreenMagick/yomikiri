import { BrowserApi, message } from "extension/browserApi";
import { Platform as IosPlatform } from ".";
import {
  type IBackend,
  type TokenizeRequest,
  TokenizeResult,
  type SearchRequest,
} from "../common/backend";
import { EXTENSION_CONTEXT } from "consts";

export * from "../common/backend";

export class IosBackend implements IBackend {
  platform: IosPlatform;
  browserApi: BrowserApi;

  constructor(platform: IosPlatform, browserApi: BrowserApi) {
    this.platform = platform;
    this.browserApi = browserApi;
  }

  async tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    if (EXTENSION_CONTEXT !== "contentScript") {
      return this._tokenize(text, charAt);
    } else {
      return message("tokenize", { text, charAt });
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

  async search(term: string, charAt?: number): Promise<TokenizeResult> {
    if (EXTENSION_CONTEXT !== "contentScript") {
      return this._search(term, charAt);
    } else {
      return message("searchTerm", { term, charAt });
    }
  }

  async _search(term: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (term === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const req: SearchRequest = { term, charAt };
    const rawResult = await this.platform.requestToApp("search", req);
    return TokenizeResult.from(rawResult);
  }
}

export const Backend = IosBackend;
export type Backend = IosBackend;
