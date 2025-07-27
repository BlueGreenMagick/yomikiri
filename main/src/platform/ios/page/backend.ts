import { cleanTokenizeResult, emptyTokenizeResult } from "@/platform/shared/backend";
import type {
  DictionaryMetadata,
  SearchArgs,
  TokenizeArgs,
  TokenizeResult,
} from "@yomikiri/backend-bindings";
import type { IosMessagingPage } from "./messaging";

export class IosBackendPage {
  constructor(private readonly messaging: IosMessagingPage) {}

  async tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const req: TokenizeArgs = { sentence: text, char_idx: charAt };
    const result = await this.messaging.send("tokenize", req);
    cleanTokenizeResult(result);
    return result;
  }

  async search(term: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (term === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const req: SearchArgs = { query: term, char_idx: charAt };
    const result = await this.messaging.send("search", req);
    cleanTokenizeResult(result);
    return result;
  }

  async getDictMetadata(): Promise<DictionaryMetadata> {
    return this.messaging.send("metadata", null);
  }
}
