import { PromiseWithProgress } from "lib/utils";
import { IosAppPlatform } from ".";
import {
  type IBackend,
  type TokenizeRequest,
  TokenizeResult,
  type SearchRequest,
} from "../common/backend";

export * from "../common/backend";

export namespace IosAppBackend {
  export async function tokenize({
    text,
    charAt,
  }: TokenizeRequest): Promise<TokenizeResult> {
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

  export async function search({
    term,
    charAt,
  }: SearchRequest): Promise<TokenizeResult> {
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

  export function updateDictionary(): PromiseWithProgress<boolean, string> {
    return PromiseWithProgress.fromPromise(
      IosAppPlatform.messageWebview("updateDict", null),
      "Updating dictionary... This may take up to a minute.",
    );
  }

  export function getDictCreationDate(): Promise<string> {
    return IosAppPlatform.messageWebview("getDictCreationDate", null);
  }
}

IosAppBackend satisfies IBackend;

export const Backend = IosAppBackend;
