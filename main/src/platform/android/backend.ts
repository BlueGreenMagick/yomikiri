import type { ProgressTask } from "@/features/utils";
import type {
  DictionaryMetadata,
  SearchArgs,
  TokenizeArgs,
  TokenizeResult,
} from "@yomikiri/backend-bindings";
import { cleanTokenizeResult, emptyTokenizeResult } from "../shared/backend";
import type { IBackend, SearchRequest, TokenizeRequest } from "../types/backend";
import { invokeBackend } from "./messaging";

export class AndroidBackend implements IBackend {
  readonly type = "android";

  async tokenize({ text, charAt }: TokenizeRequest): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const args: TokenizeArgs = { sentence: text, char_idx: charAt };
    const result = await invokeBackend({ type: "Tokenize", args });
    cleanTokenizeResult(result);
    return result;
  }

  async search({ term, charAt }: SearchRequest): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (term === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const args: SearchArgs = { query: term, char_idx: charAt };
    const result = await invokeBackend({ type: "Search", args });
    cleanTokenizeResult(result);
    return result;
  }

  getDictMetadata(): Promise<DictionaryMetadata> {
    return invokeBackend({ type: "DictionaryMetadata", args: null });
  }

  /** TODO */
  updateDictionary(): ProgressTask<boolean, string> {
    throw new Error("Unimplemented");
  }
}
