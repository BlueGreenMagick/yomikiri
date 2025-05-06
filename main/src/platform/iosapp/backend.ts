import { PromiseWithProgress } from "@/features/utils";
import { IosAppPlatform } from ".";
import type {
  IBackend,
  TokenizeRequest,
  TokenizeResult,
  SearchRequest,
  DictionaryMetadata,
  SearchArgs,
  TokenizeArgs,
} from "../types/backend";
import {
  cleanTokenizeResult,
  emptyTokenizeResult,
} from "@/platform/shared/backend";

export * from "../types/backend";

export class _IosAppBackend implements IBackend {
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
    const result = await IosAppPlatform.messageWebview("tokenize", req);
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
    const result = await IosAppPlatform.messageWebview("search", req);
    cleanTokenizeResult(result);
    return result;
  }

  updateDictionary(): PromiseWithProgress<boolean, string> {
    return PromiseWithProgress.fromPromise(
      IosAppPlatform.messageWebview("updateDict", null),
      "Updating dictionary... This may take up to a minute.",
    );
  }

  getDictMetadata(): Promise<DictionaryMetadata> {
    return IosAppPlatform.messageWebview("metadata", null);
  }
}

export const IosAppBackend = new _IosAppBackend();
export const Backend = IosAppBackend;
export type IosAppBackend = typeof Backend;
