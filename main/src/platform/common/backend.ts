import type { DictionaryMetadata, TokenizeResult } from "@yomikiri/yomikiri-rs";
import type { DesktopBackend } from "../desktop/backend";
import type { IosBackend } from "../ios/backend";
import type { IosAppBackend } from "../iosapp/backend";

export type { DesktopBackend } from "../desktop/backend";
export type { IosBackend } from "../ios/backend";
export type { IosAppBackend } from "../iosapp/backend";

export type {
  Token,
  TokenizeResult,
  DictionaryMetadata,
} from "@yomikiri/yomikiri-rs";

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

export interface IBackend {
  tokenize(req: TokenizeRequest): Promise<TokenizeResult>;
  search(req: SearchRequest): Promise<TokenizeResult>;
  getDictMetadata(): Promise<DictionaryMetadata>;
}

export declare const Backend:
  | typeof DesktopBackend
  | typeof IosBackend
  | typeof IosAppBackend;
