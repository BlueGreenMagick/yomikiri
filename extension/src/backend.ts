import {
  BackendController,
  type TokenizeResult,
  type TokenizeRequest,
} from "@platform/backend";
import { Entry } from "~/dicEntry";
import { Platform } from "@platform";
import { BrowserApi } from "./browserApi";

export type { Token, TokenizeRequest, TokenizeResult } from "@platform/backend";

export namespace Backend {
  // If _backend is null, send message to background.
  let _backend: BackendController | null = null;

  /** Api must be initialized */
  export async function initialize(): Promise<void> {
    if (
      (Platform.IS_DESKTOP && BrowserApi.context === "background") ||
      (Platform.IS_IOS &&
        ["background", "page"].includes(BrowserApi.context)) ||
      Platform.IS_IOSAPP
    ) {
      _backend = await BackendController.initialize();
    }
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

    if (_backend !== null) {
      const result = await _backend.tokenize(text, charAt);
      Entry.sort(result.entries);
      return result;
    } else {
      return await BrowserApi.request("tokenize", { text, charAt });
    }
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

    if (_backend !== null) {
      return await _backend.tokenizeRaw(text, charAt);
    } else {
      throw new Error(
        "tokenizeRaw() is a debug function that can only be called in background."
      );
    }
  }

  export async function searchTerm(term: string): Promise<Entry[]> {
    if (_backend !== null) {
      const result = await _backend.search(term);
      Entry.sort(result);
      return result;
    } else {
      return await BrowserApi.request("searchTerm", term);
    }
  }
}
