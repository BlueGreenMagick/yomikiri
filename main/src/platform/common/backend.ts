import type {
  DictionaryMetadata,
  TokenizeResult,
} from "@yomikiri/backend-bindings";
import type { DesktopBackend } from "../desktop/backend";
import type { IosBackend } from "../ios/backend";
import type { IosAppBackend } from "../iosapp/backend";
import type { IPlatformConsts } from "@/platform/ios";

export type { DesktopBackend } from "../desktop/backend";
export type { IosBackend } from "../ios/backend";
export type { IosAppBackend } from "../iosapp/backend";
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

export declare const Backend:
  | typeof DesktopBackend
  | typeof IosBackend
  | typeof IosAppBackend;
