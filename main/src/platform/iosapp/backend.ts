import { Lazy, PromiseWithProgress } from "lib/utils";
import { IosAppPlatform, type DictionaryMetadata } from ".";
import {
  type IBackend,
  type TokenizeRequest,
  TokenizeResult,
  type SearchRequest,
} from "../common/backend";
import { parseRawMetadata } from "platform/shared/utils";

export * from "../common/backend";

export class IosAppBackend implements IBackend {
  static instance: Lazy<IosAppBackend> = new Lazy(() => {
    return new IosAppBackend();
  });

  private constructor() {}

  async tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const req: TokenizeRequest = { text, charAt: charAt };
    const raw = await IosAppPlatform.messageWebview("tokenize", req);
    return TokenizeResult.from(raw);
  }

  async search(term: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (term === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const req: SearchRequest = { term, charAt };
    const raw = await IosAppPlatform.messageWebview("searchTerm", req);
    return TokenizeResult.from(raw);
  }

  updateDictionary(): PromiseWithProgress<DictionaryMetadata, string> {
    return PromiseWithProgress.fromPromise(
      IosAppPlatform.messageWebview("updateDict", null).then(parseRawMetadata),
      "Updating dictionary... This may take up to a minute.",
    );
  }
}

export const Backend = IosAppBackend;
export type Backend = IosAppBackend;
