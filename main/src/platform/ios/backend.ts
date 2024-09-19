import { NonContentScriptFunction } from "extension/browserApi";
import { IosPlatform } from ".";
import type {
  TokenizeRequest,
  TokenizeResult,
  SearchRequest,
  IBackend,
} from "../common/backend";
import {
  cleanTokenizeResult,
  emptyTokenizeResult,
} from "platform/shared/backend";

export * from "../common/backend";

export namespace IosBackend {
  export const tokenize = NonContentScriptFunction(
    "tokenize",
    ({ text, charAt }) => {
      return _tokenize(text, charAt);
    },
  );

  async function _tokenize(
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

    const req: TokenizeRequest = { text, charAt };
    const result = await IosPlatform.requestToApp("tokenize", req);
    cleanTokenizeResult(result);
    return result;
  }

  export const search = NonContentScriptFunction(
    "searchTerm",
    ({ term, charAt }) => {
      return _search(term, charAt);
    },
  );

  async function _search(
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

    const req: SearchRequest = { term, charAt };
    const result = await IosPlatform.requestToApp("search", req);
    cleanTokenizeResult(result);
    return result;
  }

  export const getDictMetadata = NonContentScriptFunction(
    "getDictMetadata",
    () => {
      return IosPlatform.requestToApp("getDictMetadata", null);
    },
  );
}

IosBackend satisfies IBackend;

export const Backend = IosBackend;
