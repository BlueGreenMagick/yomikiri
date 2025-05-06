import { NonContentScriptFunction } from "@/features/extension/browserApi";
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
import { sendMessage } from "./messaging";

export * from "../types/backend";

export class IosBackend implements IBackend {
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
    const result = await sendMessage("tokenize", req);
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
    const result = await sendMessage("search", req);
    cleanTokenizeResult(result);
    return result;
  }

  readonly getDictMetadata = NonContentScriptFunction("getDictMetadata", () => {
    return sendMessage("metadata", null);
  });
}
