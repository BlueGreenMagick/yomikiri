import { BrowserApi } from "~/extension/browserApi";
import { Platform } from ".";
import {
  type IBackendControllerStatic,
  type IBackendController,
  type TokenizeRequest,
  TokenizeResult,
} from "../common/backend";
import { Entry } from "~/dicEntry";
import { toHiragana } from "~/japanese";

export {
  type Token,
  type TokenizeRequest,
  TokenizeResult,
} from "../common/backend";

export class BackendController implements IBackendController {
  /** May only be initialized in 'background' and 'page' extension context. */
  static async initialize(): Promise<BackendController> {
    if (BrowserApi.context !== "background" && BrowserApi.context !== "page") {
      throw new Error(
        "ios BackendController may only be initialized in 'background' or 'page' context."
      );
    }
    return new BackendController();
  }

  async tokenize(text: string, charAt: number): Promise<TokenizeResult> {
    let req: TokenizeRequest = { text, charAt: charAt };
    let rawResult = await Platform.requestToApp("tokenize", req);
    rawResult.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    return TokenizeResult.from(rawResult);
  }

  async search(term: string): Promise<Entry[]> {
    return (await Platform.requestToApp("search", term))
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
  }
}

BackendController satisfies IBackendControllerStatic;