import { NonContentScriptFunction } from "extension/browserApi";
import { IosPlatform } from ".";
import {
  type TokenizeRequest,
  TokenizeResult,
  type SearchRequest,
  type IBackend,
} from "../common/backend";

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
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const req: TokenizeRequest = { text, charAt };
    const rawResult = await IosPlatform.requestToApp("tokenize", req);
    return TokenizeResult.from(rawResult);
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
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const req: SearchRequest = { term, charAt };
    const rawResult = await IosPlatform.requestToApp("search", req);
    return TokenizeResult.from(rawResult);
  }

  export const getDictCreationDate = NonContentScriptFunction(
    "getDictCreationDate",
    () => {
      return IosPlatform.requestToApp("getDictCreationDate", null);
    },
  );
}

IosBackend satisfies IBackend;

export const Backend = IosBackend;
