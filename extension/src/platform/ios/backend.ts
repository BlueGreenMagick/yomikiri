import type { TokenizeRequest } from "~/tokenizer";
import { Platform } from ".";
import type {
  IBackendStatic,
  IBackend,
  Token,
  TokenizeResult,
} from "../types/backend";
import { Entry } from "~/dicEntry";

export type { Token, TokenizeResult } from "../types/backend";

export class Backend implements IBackend {
  static async initialize(): Promise<Backend> {
    return new Backend();
  }

  async tokenize(text: string, charIdx: number): Promise<TokenizeResult> {
    let req: TokenizeRequest = { text, charIdx };
    let rawResult = await Platform.requestToApp("tokenize", req);
    return {
      tokens: rawResult.tokens,
      selectedTokenIdx: rawResult.selectedTokenIdx,
      selectedDicEntry: rawResult.dicEntriesJson
        .map((json) => JSON.parse(json))
        .map(Entry.fromObject),
    };
  }
}

Backend satisfies IBackendStatic;
