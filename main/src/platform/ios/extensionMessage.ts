import type { StoredConfigurationV1 } from "@/features/compat";
import type { StoredConfig } from "@/features/config";
import {
  type ExtensionMessage,
  type MessageByKey,
  sendExtensionMessage,
} from "@/features/extension/message";
import type { AppCommand } from "@yomikiri/backend-uniffi-bindings";
import type { AppCommandResult } from "../shared/invokeApp";
import type { TranslateResult, TTSRequest, TTSVoice } from "../types";
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

export type IosExtensionMessage =
  | ExtensionMessage<"IosPlatform.getStore", string, unknown>
  | ExtensionMessage<"IosPlatform.getStoreBatch", string[], Record<string, unknown>>
  | ExtensionMessage<"IosPlatform.setStore", SetStoreRequest, void>
  | ExtensionMessage<"IosPlatform.setStoreBatch", Record<string, unknown>, void>
  | ExtensionMessage<"IosPlatform.getConfig", void, StoredConfigurationV1>
  | ExtensionMessage<"IosPlatform.saveConfig", StoredConfig, void>
  | ExtensionMessage<"IosPlatform.playTTS", TTSRequest, void>
  | ExtensionMessage<"IosPlatform.translate", string, TranslateResult>
  | ExtensionMessage<"IosPlatform.migrateConfig", void, StoredConfig>
  | ExtensionMessage<"IosPlatform.japaneseTTSVoices", void, TTSVoice[]>
  | ExtensionMessage<"IosAnkiApi.addNote", AnkiAddNoteReq, boolean>
  | ExtensionMessage<"IosBackend.tokenize", TokenizeRequest, TokenizeResult>
  | ExtensionMessage<"IosBackend.search", SearchRequest, TokenizeResult>
  | ExtensionMessage<"IosBackend.getDictMetadata", void, DictionaryMetadata>
  | ExtensionMessage<"IosPlatform.invokeApp", AppCommand, AppCommandResult>;

type Keys = IosExtensionMessage["key"];

type ByKey<K extends Keys> = MessageByKey<IosExtensionMessage, K>;

export function sendIosExtensionMessage<K extends Keys>(
  key: K,
  request: ByKey<K>["request"],
): Promise<ByKey<K>["response"]> {
  return (
    sendExtensionMessage<IosExtensionMessage>(key, request) as Promise<ByKey<K>["response"]>
  );
}
