import { handleResponseMessage, type ResponseMessage } from "@/features/utils";
import type { RunMessageMap } from "@/platform/shared/backend";
import type { JSONStoreValues, TTSRequest, TTSVoice, VersionInfo } from "../types";
import type { RawAnkiInfo } from "./anki";

declare global {
  interface Window {
    webkit: {
      messageHandlers: {
        yomikiri: {
          postMessage: (message: {
            key: string;
            request: string;
          }) => Promise<ResponseMessage<string>>;
        };
      };
    };
  }
}

export interface MessageWebviewMap extends RunMessageMap {
  ankiIsInstalled: [null, boolean];
  // returns false if anki is not installed
  ankiInfo: [null, boolean];
  // Can only be requested in anki template options page.
  ankiInfoData: [null, RawAnkiInfo];

  setStoreBatch: [JSONStoreValues, null];
  getStoreBatch: [string[], JSONStoreValues];

  /**
   * Returns true if migrated config is 'ok' to save.
   * If config was already migrated elsewhere, returns false.
   */
  migrateConfig: [null, boolean];
  versionInfo: [null, VersionInfo];
  updateDict: [null, boolean];
  ttsVoices: [null, TTSVoice[]];
  openLink: [string, null];
  tts: [TTSRequest, null];

  runApp: [string, string];

  // action extension
  close: [null, void];
}

export type WebviewRequest<K extends keyof MessageWebviewMap> = MessageWebviewMap[K][0];
export type WebviewResponse<K extends keyof MessageWebviewMap> = MessageWebviewMap[K][1];

/** Message to app inside app's WKWebview */
export async function sendMessage<K extends keyof MessageWebviewMap>(
  key: K,
  request: WebviewRequest<K>,
): Promise<WebviewResponse<K>> {
  const message = {
    key,
    request: JSON.stringify(request),
  };
  const response = await window.webkit.messageHandlers.yomikiri.postMessage(message);
  const jsonResponse = handleResponseMessage(response);
  return JSON.parse(jsonResponse) as WebviewResponse<K>;
}
