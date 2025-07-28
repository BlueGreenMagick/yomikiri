import type { AnkiInfo } from "@/features/anki";
import type { StoredConfiguration } from "@/features/config";
import {
  type ExtensionMessage,
  type MessageByKey,
  sendExtensionMessage,
} from "@/features/extension/message";
import type { TranslateResult, TTSRequest } from "../types";
import type { AnkiAddNoteReq } from "../types/anki";
import type {
  DictionaryMetadata,
  SearchRequest,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";

export interface SetStoreRequest {
  key: string;
  value: unknown;
}

export type DesktopExtensionMessage =
  | ExtensionMessage<"DesktopPlatform.setStoreBatch", Record<string, unknown>, void>
  | ExtensionMessage<"DesktopPlatform.getStoreBatch", string[], Record<string, unknown>>
  | ExtensionMessage<"DesktopPlatform.setStore", SetStoreRequest, void>
  | ExtensionMessage<"DesktopPlatform.getStore", string, unknown>
  | ExtensionMessage<"DesktopPlatform.playTTS", TTSRequest, void>
  | ExtensionMessage<"DesktopPlatform.translate", string, TranslateResult>
  | ExtensionMessage<"DesktopPlatform.migrateConfig", void, StoredConfiguration>
  | ExtensionMessage<"DesktopBackend.tokenize", TokenizeRequest, TokenizeResult>
  | ExtensionMessage<"DesktopBackend.search", SearchRequest, TokenizeResult>
  | ExtensionMessage<"DesktopBackend.getDictMetadata", void, DictionaryMetadata>
  | ExtensionMessage<"DesktopAnkiApi.ankiInfo", void, AnkiInfo>
  | ExtensionMessage<"DesktopAnkiApi.requestAnkiInfo", void, void>
  | ExtensionMessage<"DesktopAnkiApi.checkConnection", void, void>
  | ExtensionMessage<"DesktopAnkiApi.addNote", AnkiAddNoteReq, boolean>
  | ExtensionMessage<"DesktopAnkiApi.addDeferredNotes", void, void | null>;

type Keys = DesktopExtensionMessage["key"];

type ByKey<K extends Keys> = MessageByKey<DesktopExtensionMessage, K>;

export function sendDesktopExtensionMessage<K extends Keys>(
  key: K,
  request: ByKey<K>["request"],
): Promise<ByKey<K>["response"]> {
  return (
    sendExtensionMessage<DesktopExtensionMessage>(key, request) as Promise<ByKey<K>["response"]>
  );
}
