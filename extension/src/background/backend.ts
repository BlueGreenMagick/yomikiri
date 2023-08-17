import {
  BackendController,
  type TokenizeResult,
  type TokenizeRequest,
} from "@platform/backend";
import { toHiragana } from "../japanese";
import type { Entry } from "~/dicEntry";

export type { Token, TokenizeRequest, TokenizeResult } from "@platform/backend";

export namespace Backend {
  // lazy initialization when getBackend() is called
  let _backend: BackendController;

  export async function initialize(): Promise<void> {
    _backend = await BackendController.initialize();
  }

  /** text should not be empty */
  export async function tokenizeText(text: string): Promise<TokenizeResult> {
    if (text.length === 0) {
      return {
        tokens: [],
        tokenIdx: 0,
        entries: [],
      };
    }
    return await tokenize({ text, charAt: 0 });
  }

  export async function tokenize(
    req: TokenizeRequest | string
  ): Promise<TokenizeResult> {
    const text = req instanceof Object ? req.text : req;
    const charAt = req instanceof Object ? req.charAt ?? 0 : 0;
    if (text === "") {
      return {
        tokens: [],
        tokenIdx: -1,
        entries: [],
      };
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    let result = await _backend.tokenize(text, charAt);
    result.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    return result;
  }

  export async function tokenizeRaw(
    req: TokenizeRequest | string
  ): Promise<TokenizeResult> {
    const text = req instanceof Object ? req.text : req;
    const charAt = req instanceof Object ? req.charAt ?? 0 : 0;
    if (text === "") {
      return {
        tokens: [],
        tokenIdx: -1,
        entries: [],
      };
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    let result = await _backend.tokenizeRaw(text, charAt);
    result.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    return result;
  }

  export async function searchTerm(term: string): Promise<Entry[]> {
    return _backend.search(term);
  }
}
