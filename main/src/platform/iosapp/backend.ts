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

export namespace IosAppBackend {
  export const type = "iosapp";

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

    const req: TokenizeArgs = { sentence: text, char_idx: charAt };
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

    const req: SearchArgs = { query: term, char_idx: charAt };
    const result = await IosAppPlatform.messageWebview("search", req);
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
    return IosAppPlatform.messageWebview("metadata", null);
  }
}

IosAppBackend satisfies IBackend;

export const Backend = IosAppBackend;
