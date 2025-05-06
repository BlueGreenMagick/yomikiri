import { NonContentScriptFunction } from "@/features/extension/browserApi";
import { IosPlatform } from ".";
import type {
  TokenizeResult,
  IBackend,
  TokenizeArgs,
  SearchArgs,
} from "../types/backend";
import {
  cleanTokenizeResult,
  emptyTokenizeResult,
} from "@/platform/shared/backend";

export * from "../types/backend";

export class _IosBackend implements IBackend {
  readonly type = "ios";

  readonly tokenize = NonContentScriptFunction(
    "tokenize",
    ({ text, charAt }) => {
      return this._tokenize(text, charAt);
    },
  );

  private async _tokenize(
    text: string,
    charAt?: number,
  ): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const req: TokenizeArgs = { sentence: text, char_idx: charAt };
    const result = await IosPlatform.requestToApp("tokenize", req);
    cleanTokenizeResult(result);
    return result;
  }

  readonly search = NonContentScriptFunction(
    "searchTerm",
    ({ term, charAt }) => {
      return this._search(term, charAt);
    },
  );

  private async _search(
    term: string,
    charAt?: number,
  ): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (term === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const req: SearchArgs = { query: term, char_idx: charAt };
    const result = await IosPlatform.requestToApp("search", req);
    cleanTokenizeResult(result);
    return result;
  }

  readonly getDictMetadata = NonContentScriptFunction("getDictMetadata", () => {
    return IosPlatform.requestToApp("metadata", null);
  });
}

export const IosBackend = new _IosBackend();
export type IosBackend = typeof IosBackend;
export const Backend = IosBackend;
