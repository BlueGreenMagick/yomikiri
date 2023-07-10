import type { Token } from "@yomikiri/yomikiri-rs";

export type { Token } from "@yomikiri/yomikiri-rs";

export interface IBackend {
  tokenize(text: string, charIdx: number): Promise<Token[]>;
}

export interface IBackendStatic {
  initialize(): Promise<IBackend>;
}
