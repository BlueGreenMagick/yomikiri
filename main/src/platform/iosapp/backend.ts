import { Platform } from ".";
import {
  type IBackend,
  type TokenizeRequest,
  TokenizeResult,
  type RawTokenizeResult,
} from "../common/backend";
import { Entry } from "~/dicEntry";

export {
  type Token,
  type TokenizeRequest,
  TokenizeResult,
} from "../common/backend";


export namespace Backend {
  export async function initialize(): Promise<void> {
    return
  }

  export async function tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    let req: TokenizeRequest = { text, charAt: charAt };
    let rawResultJSON = await Platform.messageWebview("tokenize", req);
    let rawResult = JSON.parse(rawResultJSON) as RawTokenizeResult;
    return TokenizeResult.from(rawResult);
  }

  export async function search(term: string): Promise<Entry[]> {
    const entries = (await Platform.messageWebview("searchTerm", term))
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
    Entry.order(entries);
    return entries;
  }
}

Backend satisfies IBackend;
