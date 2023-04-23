import type { Entry } from "../dictionary";

/// Type map for `{ key: [request, response] }`
/// Response type must not have Promise
export interface MessageMap {
  searchTerm: [string, Entry[]];
}

type First<T extends any[]> = T extends [infer FIRST, ...any[]] ? FIRST : never;
type Second<T extends any[]> = T extends [any, infer SECOND, ...any[]]
  ? SECOND
  : never;

export type Request<K extends keyof MessageMap> = First<MessageMap[K]>;
export type Response<K extends keyof MessageMap> = Second<MessageMap[K]>;
