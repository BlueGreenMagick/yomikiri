import type { DictionaryMetadata, TokenizeResult } from "@yomikiri/backend-bindings";
import type { DesktopBackend } from "../desktop";
import type { IosBackend } from "../ios";
import type { IosAppBackend } from "../iosapp";
import type { IPlatformConsts } from ".";

export type * from "@yomikiri/backend-bindings";

export interface TokenizeRequest {
  text: string;
  /**
   * Defaults to 0 if not specified.
   */
  charAt?: number | undefined;
}

export interface SearchRequest {
  term: string;
  /** Defaults to 0 if not specified. */
  charAt?: number | undefined;
}

export interface IBackend extends IPlatformConsts {
  tokenize(req: TokenizeRequest): Promise<TokenizeResult>;
  search(req: SearchRequest): Promise<TokenizeResult>;
  getDictMetadata(): Promise<DictionaryMetadata>;
}

export type AnyBackend = DesktopBackend | IosBackend | IosAppBackend;
