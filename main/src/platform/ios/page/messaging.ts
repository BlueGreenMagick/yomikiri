import { handleResponseMessage } from "@/features/utils";
import type {
  Command,
  CommandOf,
  CommandResult,
  CommandResultOf,
  CommandTypes,
} from "@/platform/shared/invoke";
import type {
  AppCommandOf,
  AppCommandResult,
  AppCommandResultOf,
  AppCommandTypes,
} from "@/platform/shared/invokeApp";
import type { AppCommand } from "@yomikiri/backend-uniffi-bindings";
import type { JSONStoreValues, TTSRequest, TTSVoice } from "../../types";

/** Type map for messages sent with `requestToApp()`*/
export interface AppMessageMap {
  setStoreBatch: [JSONStoreValues, null];
  getStoreBatch: [string[], JSONStoreValues];
  ttsVoices: [null, TTSVoice[]];
  tts: [TTSRequest, null];
  iosVersion: [null, IosVersion];

  invoke: [Command, CommandResult];
  invokeApp: [AppCommand, AppCommandResult];
}

export type AppRequest<K extends keyof AppMessageMap> = AppMessageMap[K][0];
export type AppResponse<K extends keyof AppMessageMap> = AppMessageMap[K][1];

interface IosVersion {
  major: number;
  minor: number;
  patch: number;
}

export class IosMessagingPage {
  async send<K extends keyof AppMessageMap>(
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

  async invokeApp<C extends AppCommandTypes>(
    command: AppCommandOf<C>,
  ): Promise<AppCommandResultOf<C>> {
    const result = await this.send("invokeApp", command);
    return result as AppCommandResultOf<C>;
  }

  async invokeBackend<C extends CommandTypes>(
    command: CommandOf<C>,
  ): Promise<CommandResultOf<C>> {
    const result = await this.send("invoke", command);
    return result as CommandResultOf<C>;
  }
}
