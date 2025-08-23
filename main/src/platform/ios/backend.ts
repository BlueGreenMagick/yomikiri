import { cleanTokenizeResult, emptyTokenizeResult } from "../shared/backend";
import type {
  DictionaryMetadata,
  IBackend,
  SearchArgs,
  SearchRequest,
  TokenizeArgs,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";
import type { IosMessaging } from "./messaging";

export class IosBackend implements IBackend {
  readonly type = "ios";

  constructor(public messaging: IosMessaging) {}

  async tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
    const charAt = req.charAt ?? 0;
    const text = req.text;

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

  async search(req: SearchRequest): Promise<TokenizeResult> {
    const charAt = req.charAt ?? 0;
    const term = req.term;

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
