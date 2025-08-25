import { handleResponseMessage, type ResponseMessage } from "@/features/utils";
import type {
  Command,
  CommandOf,
  CommandResult,
  CommandResultOf,
  CommandTypes,
} from "../shared/invoke";
import type {
  AppCommand,
  AppCommandOf,
  AppCommandResult,
  AppCommandResultOf,
  AppCommandTypes,
} from "../shared/invokeApp";
import type { TTSRequest, TTSVoice, VersionInfo } from "../types";
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

export interface MessageWebviewMap {
  ankiIsInstalled: [null, boolean];
  // returns false if anki is not installed
  ankiInfo: [null, boolean];
  // Can only be requested in anki template options page.
  ankiInfoData: [null, RawAnkiInfo];

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

  invokeApp: [AppCommand, AppCommandResult];
  invoke: [Command, CommandResult];

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

export async function invokeApp<C extends AppCommandTypes>(
  command: AppCommandOf<C>,
): Promise<AppCommandResultOf<C>> {
  const result = await sendMessage("invokeApp", command);
  return result as AppCommandResultOf<C>;
}

export async function invokeBackend<C extends CommandTypes>(
  command: CommandOf<C>,
): Promise<CommandResultOf<C>> {
  const result = await sendMessage("invoke", command);
  return result as CommandResultOf<C>;
}
