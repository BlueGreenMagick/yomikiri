import { BrowserApi } from "~/browserApi";
import { Platform } from ".";
import type {
  IBackendControllerStatic,
  IBackendController,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";
import { Entry } from "~/dicEntry";
import { toHiragana } from "~/japanese";

export type { Token, TokenizeRequest, TokenizeResult } from "../types/backend";

export class BackendController implements IBackendController {
  static async initialize(): Promise<BackendController> {
    return new BackendController();
  }

  async tokenize(text: string, charAt: number): Promise<TokenizeResult> {
    if (BrowserApi.context !== "background" && BrowserApi.context !== "page") {
      return await BrowserApi.request("tokenize", { text, charAt });
    }
    let req: TokenizeRequest = { text, charAt: charAt };
    let rawResult = await Platform.requestToApp("tokenize", req);
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
    if (BrowserApi.context !== "background" && BrowserApi.context !== "page") {
      return await BrowserApi.request("searchTerm", term);
    }
    return (await Platform.requestToApp("search", term))
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
  }
}

BackendController satisfies IBackendControllerStatic;
