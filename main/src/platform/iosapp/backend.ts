import { Platform as IosAppPlatform } from ".";
import {
  type IBackend,
  type TokenizeRequest,
  TokenizeResult,
  type SearchRequest,
} from "../common/backend";

export * from "../common/backend";

export class IosAppBackend implements IBackend {
  platform: IosAppPlatform;

  constructor(platform: IosAppPlatform) {
    this.platform = platform;
  }

  async tokenize(text: string, charAt?: number): Promise<TokenizeResult> {
    charAt = charAt ?? 0;

    if (text === "") {
      return TokenizeResult.empty();
    }
    if (charAt < 0 || charAt >= text.length) {
      throw new RangeError(`charAt is out of range: ${charAt}, ${text}`);
    }

    const req: TokenizeRequest = { text, charAt: charAt };
    const raw = await this.platform.messageWebview("tokenize", req);
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
    const raw = await this.platform.messageWebview("searchTerm", req);
    return TokenizeResult.from(raw);
  }
}

export const Backend = IosAppBackend;
export type Backend = IosAppBackend;
