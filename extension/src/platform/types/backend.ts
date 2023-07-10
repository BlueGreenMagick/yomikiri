import type { Token } from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";

export type { Token } from "@yomikiri/yomikiri-rs";

export interface TokenizeResult {
  tokens: Token[];
  selectedTokenIdx: number;
  selectedDicEntry: Entry[];
}

export interface IBackend {
  tokenize(text: string, charIdx: number): Promise<TokenizeResult>;
}

export interface IBackendStatic {
  initialize(): Promise<IBackend>;
}
