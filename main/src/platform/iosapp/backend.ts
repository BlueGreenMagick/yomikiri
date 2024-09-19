import { PromiseWithProgress } from "lib/utils";
import { IosAppPlatform } from ".";
import type {
  IBackend,
  TokenizeRequest,
  TokenizeResult,
  SearchRequest,
  DictionaryMetadata,
} from "../common/backend";
import {
  cleanTokenizeResult,
  emptyTokenizeResult,
} from "platform/shared/backend";

export * from "../common/backend";

export namespace IosAppBackend {
  export async function tokenize({
    text,
    charAt,
  }: TokenizeRequest): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const req: TokenizeRequest = { text, charAt: charAt };
    const result = await IosAppPlatform.messageWebview("tokenize", req);
    cleanTokenizeResult(result);
    return result;
  }

  export async function search({
    term,
    charAt,
  }: SearchRequest): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (term === "") {
      return emptyTokenizeResult();
    }
    if (charAt < 0 || charAt >= term.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${term}`);
    }

    const req: SearchRequest = { term, charAt };
    const result = await IosAppPlatform.messageWebview("searchTerm", req);
    cleanTokenizeResult(result);
    return result;
  }

  export function updateDictionary(): PromiseWithProgress<boolean, string> {
    return PromiseWithProgress.fromPromise(
      IosAppPlatform.messageWebview("updateDict", null),
      "Updating dictionary... This may take up to a minute.",
    );
  }

  export function getDictMetadata(): Promise<DictionaryMetadata> {
    return IosAppPlatform.messageWebview("getDictMetadata", null);
  }
}

IosAppBackend satisfies IBackend;

export const Backend = IosAppBackend;
