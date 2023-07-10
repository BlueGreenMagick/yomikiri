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
  backend: Backend;

  private constructor(backend: Backend) {
    this.backend = backend;
  }

  /// load wasm and initialize
  static async initialize(): Promise<BackendWrapper> {
    return new BackendWrapper(await Backend.initialize());
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
    Utils.benchStart();
    let result = await this.backend.tokenize(req.text, req.charIdx);
    result.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });
    return result;
  }

  async searchTerm(term: string): Promise<Entry[]> {
    return this.backend.search(term);
  }
}
