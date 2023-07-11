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
    return await this.tokenize({ text, charIdx: 0 });
  }

  async tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
    if (req.charIdx < 0 || req.charIdx >= req.text.length) {
      throw new RangeError(
        `selectedCharIdx is out of range: ${req.charIdx}, ${req.text}`
      );
    }
    let backend = await this.backendP;
    let result = await backend.tokenize(req.text, req.charIdx);
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
