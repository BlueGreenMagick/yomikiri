import { Platform } from ".";
import {
  type IBackendControllerStatic,
  type IBackendController,
  type TokenizeRequest,
  TokenizeResult,
  type RawTokenizeResult,
} from "../common/backend";
import { Entry } from "~/dicEntry";
import { toHiragana } from "~/japanese";

export {
  type Token,
  type TokenizeRequest,
  TokenizeResult,
} from "../common/backend";

export class BackendController implements IBackendController {
  static async initialize(): Promise<BackendController> {
    return new BackendController();
  }

  async tokenize(text: string, charAt: number): Promise<TokenizeResult> {
    let req: TokenizeRequest = { text, charAt: charAt };
    let rawResultJSON = await Platform.messageWebview("tokenize", req);
    let rawResult = JSON.parse(rawResultJSON) as RawTokenizeResult;
    rawResult.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    return TokenizeResult.from(rawResult);
  }

  async search(term: string): Promise<Entry[]> {
    return (await Platform.messageWebview("searchTerm", term))
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
  }
}

BackendController satisfies IBackendControllerStatic;