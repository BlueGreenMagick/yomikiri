import { DeferredWithProgress } from "@/features/utils";
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
import { sendMessage } from "./messaging";

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

    const req: TokenizeArgs = { sentence: text, char_idx: charAt };
    const result = await sendMessage("tokenize", req);
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

    const req: SearchArgs = { query: term, char_idx: charAt };
    const result = await sendMessage("search", req);
    cleanTokenizeResult(result);
    return result;
  }

  updateDictionary(): DeferredWithProgress<boolean, string> {
    return DeferredWithProgress.fromPromise(
      sendMessage("updateDict", null),
      "Updating dictionary... This may take up to a minute.",
    );
  }

  getDictMetadata(): Promise<DictionaryMetadata> {
    return sendMessage("metadata", null);
  }
}
