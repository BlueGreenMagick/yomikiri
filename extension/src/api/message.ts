import type { Entry } from "~/dictionary";
import type { NoteData } from "~/anki";
import type { Token } from "@platform/tokenizer";
import type { TokenizeRequest, TokenizeResult } from "~/tokenizer/tokenizer";

/// Type map for `{ key: [request, response] }`
/// Response type must not have Promise
/// Request type cannot be void, but response can be void
export interface MessageMap {
  searchTerm: [string, Entry[]];
  tokenize: [TokenizeRequest, TokenizeResult];
  /** Note -> nid */
  addAnkiNote: [NoteData, number];
}

export interface AppMessageMap {
  tokenize: [string, Token[]];
  addNote: [NoteData, number];
  deckNames: [null, string[]];
  notetypeNames: [null, string[]];
  notetypeFields: [string, string[]];
  ankiSync: [null, null];
  // [username, password]
  ankiLogin: [[string, string], null];
}

type First<T extends any[]> = T extends [infer FIRST, ...any[]] ? FIRST : never;
type Second<T extends any[]> = T extends [any, infer SECOND, ...any[]]
  ? SECOND
  : never;

export type Request<K extends keyof MessageMap> = First<MessageMap[K]>;
export type Response<K extends keyof MessageMap> = Second<MessageMap[K]>;

export type AppRequest<K extends keyof AppMessageMap> = First<AppMessageMap[K]>;
export type AppResponse<K extends keyof AppMessageMap> = Second<
  AppMessageMap[K]
>;
