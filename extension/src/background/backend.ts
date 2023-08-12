import {
  Backend,
  type TokenizeResult,
  type TokenizeRequest,
} from "@platform/backend";
import Utils from "~/utils";
import { toHiragana } from "../japanese";
import type { Entry } from "~/dicEntry";

export type { Token, TokenizeRequest, TokenizeResult } from "@platform/backend";

export class BackendWrapper {
  backendP: Promise<Backend>;

  constructor() {
    this.backendP = Backend.initialize();
  }

  /** text should not be empty */
  async tokenizeText(text: string): Promise<TokenizeResult> {
    if (text.length === 0) {
      return {
        tokens: [],
        tokenIdx: 0,
        entries: [],
      };
    }
    return await this.tokenize({ text, charAt: 0 });
  }

  async tokenize(req: TokenizeRequest | string): Promise<TokenizeResult> {
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

    let backend = await this.backendP;
    let result = await backend.tokenize(text, charAt);
    result.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    return result;
  }

  async tokenize_raw(req: TokenizeRequest | string): Promise<TokenizeResult> {
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

    let backend = await this.backendP;
    let result = await backend.tokenize_raw(text, charAt);
    result.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    return result;
  }

  async searchTerm(term: string): Promise<Entry[]> {
    let backend = await this.backendP;
    return backend.search(term);
  }
}
