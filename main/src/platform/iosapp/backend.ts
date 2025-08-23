import { ProgressTask } from "@/features/utils";
import { cleanTokenizeResult, emptyTokenizeResult } from "@/platform/shared/backend";
import type {
  DictionaryMetadata,
  IBackend,
  SearchArgs,
  SearchRequest,
  TokenizeArgs,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";
import { invokeBackend, sendMessage } from "./messaging";

export class IosAppBackend implements IBackend {
  readonly type = "iosapp";

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

  updateDictionary(): ProgressTask<boolean, string> {
    return new ProgressTask(
      "Updating dictionary... This may take up to a minute.",
      async () => {
        return await sendMessage("updateDict", null);
      },
    );
  }

  getDictMetadata(): Promise<DictionaryMetadata> {
    return invokeBackend({ type: "DictionaryMetadata", args: null });
  }
}
