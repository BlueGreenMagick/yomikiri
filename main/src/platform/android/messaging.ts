import type { StoredCompatConfiguration } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import { YomikiriError } from "@/features/error";
import { createPromise } from "@/features/utils";
import type { RunMessageMap } from "../shared/backend";

/** Secret key used in android message handler */
declare const __ANDROID_MESSAGE_SECRET_KEY: string;

declare global {
  interface Window {
    __yomikiriInterface?: AndroidMessagingInterface;
  }
}

type PostMessageFn = (message: string) => void;
type OnReceiveMessageFn = (event: { data: string }) => void;
interface AndroidMessagingInterface {
  postMessage: PostMessageFn;
  onmessage?: OnReceiveMessageFn;
}

let messagingInterface: AndroidMessagingInterface = {
  postMessage: () => {
    throw new Error("Could not capture js interface");
  },
};

if (Object.prototype.hasOwnProperty.call(window, "__yomikiriInterface")) {
  messagingInterface = window.__yomikiriInterface!;
  delete window["__yomikiriInterface"];
}

export interface AndroidMessageMap extends RunMessageMap {
  saveConfig: [StoredConfiguration, null];
  loadConfig: [null, StoredCompatConfiguration];
  versionInfo: [null, string];
}

export type MessageRequest<K extends keyof AndroidMessageMap> = AndroidMessageMap[K][0];
export type MessageResponse<K extends keyof AndroidMessageMap> = AndroidMessageMap[K][1];

type JSONString = string;

// response format for extension and ios messaging
export interface SuccessfulResponseMessage {
  id: number;
  success: true;
  resp: JSONString;
}

export interface FailedResponseMessage {
  id: number;
  success: false;
  error: JSONString;
}

export type ResponseMessage = SuccessfulResponseMessage | FailedResponseMessage;

const responseHandlers = new Map<
  number,
  [(response: unknown) => void, (error: YomikiriError) => void]
>();

messagingInterface.onmessage = (event) => {
  const message = event.data;
  const response = JSON.parse(message) as ResponseMessage;
  if (!responseHandlers.has(response.id)) {
    console.error(
      `No message handler exists for id: ${response.id}, but received response:`,
      response,
    );
  }
  const [onSuccess, onError] = responseHandlers.get(response.id)!;
  responseHandlers.delete(response.id);
  if (response.success) {
    onSuccess(JSON.parse(response.resp));
  } else {
    onError(YomikiriError.from(JSON.parse(response.error)));
  }
};

/** Unique id attached to each message. Used to map response to request. */
let messageId = 0;

export async function sendMessage<K extends keyof AndroidMessageMap>(
  key: K,
  request: MessageRequest<K>,
): Promise<MessageResponse<K>> {
  messageId += 1;
  const message = {
    id: messageId,
    key,
    request: JSON.stringify(request),
  };
  const stringifiedMessage = JSON.stringify(message);
  messagingInterface.postMessage(stringifiedMessage);
  const [promise, resolve, reject] = createPromise<MessageResponse<K>>();
  responseHandlers.set(messageId, [resolve as (resp: unknown) => void, reject]);
  return promise;
}
