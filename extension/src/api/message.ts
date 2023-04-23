import type { Entry } from "../dictionary";
import type { Token } from "@yomikiri/tokenizer";

/// Type map for `{ key: [request, response] }`
/// Response type must not have Promise
export interface MessageMap {
  searchTerm: [string, Entry[]];
  tokenize: [string, Token[]];
}

type First<T extends any[]> = T extends [infer FIRST, ...any[]] ? FIRST : never;
type Second<T extends any[]> = T extends [any, infer SECOND, ...any[]]
  ? SECOND
  : never;

export type Request<K extends keyof MessageMap> = First<MessageMap[K]>;
export type Response<K extends keyof MessageMap> = Second<MessageMap[K]>;
