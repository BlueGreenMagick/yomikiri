import { Platform } from ".";
import type {
  IBackendControllerStatic,
  IBackendController,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";
import { Entry } from "~/dicEntry";

export type { Token, TokenizeRequest, TokenizeResult } from "../types/backend";

export class BackendController implements IBackendController {
  static async initialize(): Promise<BackendController> {
    return new BackendController();
  }

  async tokenize(text: string, charAt: number): Promise<TokenizeResult> {
    let req: TokenizeRequest = { text, charAt: charAt };
    let rawResult = await Platform.requestToApp("tokenize", req);
    return {
      tokens: rawResult.tokens,
      tokenIdx: rawResult.tokenIdx,
      entries: rawResult.entriesJson
        .map((json) => JSON.parse(json))
        .map(Entry.fromObject),
    };
  }

  async search(term: string): Promise<Entry[]> {
    return (await Platform.requestToApp("search", term))
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
  }
}

BackendController satisfies IBackendControllerStatic;
