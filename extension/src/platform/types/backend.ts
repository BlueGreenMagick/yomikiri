import type { Token } from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";

export type { Token } from "@yomikiri/yomikiri-rs";

export interface TokenizeRequest {
  text: string;
  charIdx: number;
}

export interface TokenizeResult {
  tokens: Token[];
  selectedTokenIdx: number;
  selectedDicEntry: Entry[];
}

export interface IBackend {
  tokenize(text: string, charIdx: number): Promise<TokenizeResult>;
  search(term: string): Promise<Entry[]>;
}

export interface IBackendStatic {
  initialize(): Promise<IBackend>;
}
