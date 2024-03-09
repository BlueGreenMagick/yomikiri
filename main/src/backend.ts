import {
  BackendController,
  TokenizeResult,
  type TokenizeRequest,
} from "@platform/backend";
import { Entry } from "~/dicEntry";
import { Platform } from "@platform";
import { BrowserApi } from "./extension/browserApi";
import Utils from "./utils";

export {
  type Token,
  type TokenizeRequest,
  TokenizeResult,
} from "@platform/backend";

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
        grammars: [],
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
        grammars: [],
      };
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    if (_backend !== null) {
      const codePointAt = Utils.toCodePointIndex(text, charAt);
      const result = await _backend.tokenize(text, codePointAt);

      const selectedToken = result.tokens[result.tokenIdx];

      result.entries = Entry.validEntriesForSurface(
        result.entries,
        selectedToken.text
      );
      Entry.order(result.entries, selectedToken);

      console.debug(result);
      return result;
    } else {
      return await BrowserApi.request("tokenize", { text, charAt });
    }
  }

  export async function searchTerm(term: string): Promise<Entry[]> {
    if (_backend !== null) {
      const result = await _backend.search(term);
      Entry.order(result);
      return result;
    } else {
      return await BrowserApi.request("searchTerm", term);
    }
  }
}