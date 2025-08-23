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

    const args: TokenizeArgs = { sentence: text, char_idx: charAt };
    const result = await this.messaging.invokeBackend({ type: "Tokenize", args });
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

    const args: SearchArgs = { query: term, char_idx: charAt };
    const result = await this.messaging.invokeBackend({ type: "Search", args });
    cleanTokenizeResult(result);
    return result;
  }

  getDictMetadata(): Promise<DictionaryMetadata> {
    return this.messaging.invokeBackend({ type: "DictionaryMetadata", args: null });
  }
}
