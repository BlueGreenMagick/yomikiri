/*
Terminology for messaging:
- MessageRequest: request body of message
- RequestMessage: message frame containing actual request
*/

import { YomikiriError } from "@/features/error";
import {
  createPromise,
  handleResponseMessage,
  type PromiseResolver,
  type ResponseMessage,
} from "@/features/utils";
import { EXTENSION_CONTEXT } from "consts";

interface RequestMessage<Req> {
  key: string;
  request: Req;
}

export type MessageSender = chrome.runtime.MessageSender;

export type MessageHandler<Req, Resp> = (
  request: Req,
  sender: MessageSender,
) => Resp | Promise<Resp>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _messageHandlers: Map<string, MessageHandler<any, unknown>> = new Map();

/**
 * Used to receive and send message to other extension execution contexts.
 *
 * `key` must be unique across API in `@/features/extension/message.ts`
 */
export class ExtensionMessaging<Req, Resp> {
  constructor(public readonly key: string) {}

  handle(handler: MessageHandler<Req, Resp>) {
    if (_messageHandlers.has(this.key)) {
      console.error("Attaching duplicate message handler for: ", this.key);
    }
    _messageHandlers.set(this.key, handler);
  }

  /**
   * Send message to all extension pages.
   * Returns the return value of the message handler.
   *
   * Message is not sent to content scripts. Use `messageToTab()` instead.
   */
  async send(request: Req): Promise<Resp> {
    const [promise, resolve, reject] = createPromise<Resp>();
    const message: RequestMessage<Req> = {
      key: this.key,
      request,
    };
    const handler = createMessageResponseHandler(resolve, reject);
    const initialHandler = (
      resp: ResponseMessage<Resp> | undefined,
    ) => {
      // background not set up yet. try request again.
      if (resp === undefined) {
        console.debug("Could not connect to backend. Trying again.");
        setTimeout(() => {
          chrome.runtime.sendMessage(message, handler);
        }, 1000);
      } else {
        handler(resp);
      }
    };

    chrome.runtime.sendMessage(message, initialHandler);
    return promise;
  }

  async sendToTab(tabId: number, request: Req): Promise<Resp> {
    const [promise, resolve, reject] = createPromise<Resp>();
    const message: RequestMessage<Req> = {
      key: this.key,
      request,
    };
    chrome.tabs.sendMessage(
      tabId,
      message,
      createMessageResponseHandler(resolve, reject),
    );
    return promise;
  }

  /** Responses may contain undefined if a tab did not handle message */
  async sendToAllTabs(request: Req): Promise<(Resp | undefined)[]> {
    const [outerPromise, outerResolve, outerReject] = createPromise<
      (Resp | undefined)[]
    >();
    const message: RequestMessage<Req> = {
      key: this.key,
      request,
    };

    chrome.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
      const promises: Promise<Resp>[] = [];
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          const [promise, resolve, reject] = createPromise<Resp>();
          const handler = createMessageResponseHandler(resolve, reject);
          chrome.tabs.sendMessage(tab.id, message, (resp) => {
            if (
              resp === undefined ||
              chrome.runtime.lastError?.message?.includes(
                "Could not establish connection. Receiving end does not exist.",
              )
            ) {
              resolve(resp); // eslint-disable-line
            } else if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError.message);
            } else {
              handler(resp); // eslint-disable-line
            }
          });
          promises.push(promise);
        }
      }
      Promise.all(promises).then(outerResolve).catch(outerReject);
    });

    return outerPromise;
  }
}

/** It is assumed that request does return a response. */
function createMessageResponseHandler<Resp>(
  resolve: PromiseResolver<Resp>,
  reject: (reason: Error) => void,
): (resp: ResponseMessage<Resp>) => void {
  return (resp: ResponseMessage<Resp>) => {
    try {
      const response = handleResponseMessage(resp);
      resolve(response);
    } catch (error: unknown) {
      reject(YomikiriError.from(error));
    }
  };
}

/**
 * Returns a function that:
 * - If in background context: runs `fn`
 * - Else: Sends a message to background to run `fn`.
 *
 * If in background, it attaches a message handler that executes `fn`.
 *
 * `key` must be unique across API in `@/features/extension/message.ts`
 */
export function BackgroundFunction<Args extends unknown[] = [], Resp = void>(
  key: string,
  fn: (...arg: Args) => Promise<Resp>,
): (...arg: Args) => Promise<Resp> {
  const messaging = new ExtensionMessaging<Args, Resp>(key);

  if (EXTENSION_CONTEXT === "background") {
    messaging.handle((req) => fn(...req));
  }

  return function inner(...args: Args): Promise<Resp> {
    if (EXTENSION_CONTEXT !== "background") {
      return messaging.send(args);
    } else {
      return fn(...args);
    }
  };
}

/**
 * Returns a function that:
 * - If in content script: sends a message to background to run `fn`
 * - Else: runs `fn` as-is.
 *
 * If in background, it attaches a message handler that executes `fn`.
 *
 * `key` must be unique across API in `@/features/extension/message.ts`
 */
export function NonContentScriptFunction<Args extends unknown[] = [], Resp = void>(
  key: string,
  fn: (...args: Args) => Promise<Resp>,
): (...args: Args) => Promise<Resp> {
  const messaging = new ExtensionMessaging<Args, Resp>(key);
  if (EXTENSION_CONTEXT === "background") {
    messaging.handle((req) => fn(...req));
  }

  return function inner(...args: Args): Promise<Resp> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return messaging.send(args);
    } else {
      return fn(...args);
    }
  };
}

chrome.runtime.onMessage.addListener(
  (
    message: RequestMessage<unknown>,
    sender: MessageSender,
    sendResponse: (
      response?: ResponseMessage<unknown>,
    ) => void,
  ): boolean => {
    console.debug(message.key, message);
    const handler = _messageHandlers.get(message.key);
    if (handler) {
      void (async () => {
        try {
          const resp = await handler(message.request, sender);
          sendResponse({
            success: true,
            resp: resp,
          });
        } catch (e) {
          const err = YomikiriError.from(e);
          sendResponse({
            success: false,
            error: err,
          });
          console.error(e);
        }
      })();
      return true;
    } else {
      return false;
    }
  },
);
