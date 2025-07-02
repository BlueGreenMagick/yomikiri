import { handleResponseMessage } from "@/features/utils";
import type { RunMessageMap } from "../shared/backend";
import type { JSONStorageValues, TTSRequest, TTSVoice } from "../types";

/** Type map for messages sent with `requestToApp()`*/
export interface AppMessageMap extends RunMessageMap {
  setStorageBatch: [JSONStorageValues, null];
  getStorageBatch: [string[], JSONStorageValues];
  ttsVoices: [null, TTSVoice[]];
  tts: [TTSRequest, null];
  iosVersion: [null, IosVersion];
}

export type AppRequest<K extends keyof AppMessageMap> = AppMessageMap[K][0];
export type AppResponse<K extends keyof AppMessageMap> = AppMessageMap[K][1];

interface IosVersion {
  major: number;
  minor: number;
  patch: number;
}

/** Only works in background & page */
export async function sendMessage<K extends keyof AppMessageMap>(
  key: K,
  request: AppRequest<K>,
): Promise<AppResponse<K>> {
  // eslint-disable-next-line
  const resp = await browser.runtime.sendNativeMessage("_", {
    key,
    request: JSON.stringify(request),
  });
  // eslint-disable-next-line
  const jsonResponse = handleResponseMessage<string>(resp);
  return JSON.parse(jsonResponse) as AppResponse<K>;
}
