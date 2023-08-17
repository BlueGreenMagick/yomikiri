import type { Token } from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";

export type { Token, RawTokenizeResult } from "@yomikiri/yomikiri-rs";

export interface TokenizeRequest {
  text: string;
  /** Default to 0 if not specified */
  charAt?: number;
}

export interface TokenizeResult {
  tokens: Token[];
  /** May be -1 if tokens is empty */
  tokenIdx: number;
  entries: Entry[];
}

export interface IBackendController {
  tokenize(text: string, charAt: number): Promise<TokenizeResult>;
  search(term: string): Promise<Entry[]>;
}

export interface IBackendControllerStatic {
  initialize(): Promise<IBackendController>;
}
