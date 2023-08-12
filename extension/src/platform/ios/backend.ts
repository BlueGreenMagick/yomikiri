import { Platform } from ".";
import type {
  IBackendStatic,
  IBackend,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";
import { Entry } from "~/dicEntry";

export type { Token, TokenizeRequest, TokenizeResult } from "../types/backend";

export class Backend implements IBackend {
  static async initialize(): Promise<Backend> {
    return new Backend();
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

Backend satisfies IBackendStatic;
