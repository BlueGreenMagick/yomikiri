import type {
  RawTokenizeResult,
} from "@yomikiri/yomikiri-rs";
import { Entry } from "~/dicEntry";
import { toHiragana } from "~/japanese";

export type { Token, RawTokenizeResult } from "@yomikiri/yomikiri-rs";

export interface TokenizeRequest {
  text: string;
  /**
   * Defaults to 0 if not specified.
   */
  charAt?: number;
}

export interface TokenizeResult extends Omit<RawTokenizeResult, "entries"> {
  entries: Entry[];
}

export namespace TokenizeResult {
  export function empty(): TokenizeResult {
    return {
      entries: [],
      tokens: [],
      tokenIdx: -1,
      grammars: [],
    };
  }

  export function from(raw: RawTokenizeResult): TokenizeResult {
    raw.tokens.forEach((token) => {
      const reading = token.reading === "*" ? token.text : token.reading;
      token.reading = toHiragana(reading);
    });

    let entries = raw.entries
      .map((json) => JSON.parse(json))
      .map(Entry.fromObject);
    const selectedToken = raw.tokens[raw.tokenIdx];
    entries = Entry.validEntriesForSurface(entries, selectedToken.text);
    Entry.order(entries, selectedToken);

    const result = {
      ...raw,
      entries,
    };
    console.debug(result);
    return result;
  }
}

export interface IBackend {
  initialize(): Promise<void>;
  tokenize(text: string, charAt?: number): Promise<TokenizeResult>;
  search(term: string): Promise<Entry[]>;
}

export declare const Backend: IBackend