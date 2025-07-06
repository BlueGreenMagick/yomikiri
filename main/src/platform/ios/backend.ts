import { NonContentScriptFunction } from "@/features/extension";
import { cleanTokenizeResult, emptyTokenizeResult } from "@/platform/shared/backend";
import type {
  IBackend,
  SearchArgs,
  SearchRequest,
  TokenizeArgs,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";
import { sendMessage } from "./messaging";

export class IosBackend implements IBackend {
  readonly type = "ios";

  readonly tokenize = NonContentScriptFunction(
    "IosBackend.tokenize",
    ({ text, charAt }: TokenizeRequest) => {
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
    "IosBackend.search",
    ({ term, charAt }: SearchRequest) => {
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

  readonly getDictMetadata = NonContentScriptFunction(
    "IosBackend.getDictMetadata",
    () => {
      return sendMessage("metadata", null);
    },
  );
}
