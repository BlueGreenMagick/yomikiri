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
import type { TTSRequest, TTSVoice } from "../types";
import { sendIosExtensionMessage } from "./extensionMessage";

/** Type map for messages sent with `requestToApp()`*/
export interface AppMessageMap {
  ttsVoices: [null, TTSVoice[]];
  tts: [TTSRequest, null];
  iosVersion: [null, IosVersion];

  invoke: [Command, CommandResult];
  invokeApp: [AppCommand, AppCommandResult];
}

export type AppRequest<K extends keyof AppMessageMap> = AppMessageMap[K][0];
export type AppResponse<K extends keyof AppMessageMap> = AppMessageMap[K][1];

export type AnyAppResponse = AppResponse<keyof AppMessageMap>;

type IosMessagingSendRequest<K extends keyof AppMessageMap> = {
  key: K;
  request: AppRequest<K>;
};

export type AnyIosMessagingSendRequest = IosMessagingSendRequest<keyof AppMessageMap>;

interface IosVersion {
  major: number;
  minor: number;
  patch: number;
}

export class IosMessaging {
  private constructor(private page: boolean) {}

  static background() {
    return new IosMessaging(true);
  }

  static page() {
    return new IosMessaging(true);
  }

  static content() {
    return new IosMessaging(false);
  }

  async send<K extends keyof AppMessageMap>(
    key: K,
    request: AppRequest<K>,
  ): Promise<AppResponse<K>> {
    if (this.page) {
      // eslint-disable-next-line
      const resp = await browser.runtime.sendNativeMessage("_", {
        key,
        request: JSON.stringify(request),
      });
      // eslint-disable-next-line
      const jsonResponse = handleResponseMessage<string>(resp);
      return JSON.parse(jsonResponse) as AppResponse<K>;
    } else {
      const req: IosMessagingSendRequest<K> = { key, request };
      return sendIosExtensionMessage("IosMessaging.send", req);
    }
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
