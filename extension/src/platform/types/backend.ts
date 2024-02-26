import type {
  GrammarInfo,
  Token,
  RawTokenizeResult,
} from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";

export type { Token, RawTokenizeResult } from "@yomikiri/yomikiri-rs";

export interface TokenizeRequest {
  text: string;
  /** Default to 0 if not specified */
  charAt?: number;
}

export interface TokenizeResult extends Omit<RawTokenizeResult, "entries"> {
  entries: Entry[];
}

export namespace TokenizeResult {
  export function from(raw: RawTokenizeResult): TokenizeResult {
    return {
      ...raw,
      entries: raw.entries
        .map((json) => JSON.parse(json))
        .map(Entry.fromObject),
    };
  }
}

export interface IBackendController {
  tokenize(text: string, charAt: number): Promise<TokenizeResult>;
  search(term: string): Promise<Entry[]>;
}

export interface IBackendControllerStatic {
  initialize(): Promise<IBackendController>;
}
