import type { Entry } from "~/dictionary";
import type { Note } from "./anki";
import type { TokenizeRequest, TokenizeResult } from "~/tokenizer/tokenizer";

/// Type map for `{ key: [request, response] }`
/// Response type must not have Promise
/// Request type cannot be void, but response can be void
export interface MessageMap {
  searchTerm: [string, ParsedClass<Entry>[]];
  tokenize: [TokenizeRequest, TokenizeResult];
  /** Note -> nid */
  addAnkiNote: [Note, number];
}

type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];
type ParsedClass<T> = Pick<T, NonFunctionPropertyNames<T>>;

type First<T extends any[]> = T extends [infer FIRST, ...any[]] ? FIRST : never;
type Second<T extends any[]> = T extends [any, infer SECOND, ...any[]]
  ? SECOND
  : never;

export type Request<K extends keyof MessageMap> = First<MessageMap[K]>;
export type Response<K extends keyof MessageMap> = Second<MessageMap[K]>;
