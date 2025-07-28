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

export type ExtensionMessage<Key extends string, Request, Response> = {
  key: Key;
  request: Request;
  response: Response;
};

type AnyExtensionMessage = ExtensionMessage<string, unknown, unknown>;

interface RequestMessage<Message extends AnyExtensionMessage> {
  key: Message["key"];
  request: Message["request"];
}

export type MessageSender = chrome.runtime.MessageSender;

export type MessageHandler<Req, Resp> = (
  request: Req,
  sender: MessageSender,
) => Resp | Promise<Resp>;

export type MessageByKey<M extends AnyExtensionMessage, K extends M["key"]> = Extract<
  M,
  { key: K }
>;

/**
 * Handles message from other extension execution contexts.
 *
 * This class supports type checking that:
 * 1) For each key, only one handler is attached
 * 2) All keys are handled
 *
 * But the type checking mechanism is somewhat brittle,
 * and only works if you use it like below code.
 *
 * ```ts
 * ExtensionMessageListener<AllMessagesToHandle>
 * .on("key", () => {})
 * .build()
 * .verify()
 * ```
 */
export class ExtensionMessageListener<M extends AnyExtensionMessage> {
  _messageHandlers: Map<M["key"], MessageHandler<M["request"], M["response"]>> = new Map();

  private constructor() {
    chrome.runtime.onMessage.addListener(
      (
        message: RequestMessage<M>,
        sender: MessageSender,
        sendResponse: (
          response?: ResponseMessage<unknown>,
        ) => void,
      ): boolean => {
        const handler = this._messageHandlers.get(message.key);
        if (handler) {
          // Must return true synchronously to wait for response instead of closing message port immediately
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
            }
          })();

          return true;
        } else {
          return false;
        }
      },
    );
  }

  static init<T extends AnyExtensionMessage>(): ExtensionMessageListener<T> {
    return new ExtensionMessageListener();
  }

  on<K extends M["key"]>(
    key: K,
    handler: MessageHandler<MessageByKey<M, K>["request"], MessageByKey<M, K>["response"]>,
  ): ExtensionMessageListener<Exclude<M, MessageByKey<M, K>>> {
    this._messageHandlers.set(key, handler);
    return this as unknown as ExtensionMessageListener<Exclude<M, MessageByKey<M, K>>>;
  }

  done(): [M] extends [never] ? this : never;
  done(): this {
    return this;
  }

  verify(): void {}
}

export function sendExtensionMessage<M extends AnyExtensionMessage>(
  key: M["key"],
  request: M["request"],
): Promise<M["response"]> {
  const [promise, resolve, reject] = createPromise<M["response"]>();
  const message: RequestMessage<M> = {
    key,
    request,
  };
  const handler = createMessageResponseHandler(resolve, reject);
  const initialHandler = (
    resp: ResponseMessage<M["response"]> | undefined,
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

export async function sendExtensionMessageToTab<M extends AnyExtensionMessage>(
  tabId: number,
  key: M["key"],
  request: M["request"],
): Promise<M["response"]> {
  const [promise, resolve, reject] = createPromise<M["response"]>();
  const message: RequestMessage<M> = {
    key,
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
export async function sendExtensionMessageToAllTabs<M extends AnyExtensionMessage>(
  key: M["key"],
  request: M["request"],
): Promise<(M["response"] | undefined)[]> {
  const [outerPromise, outerResolve, outerReject] = createPromise<
    (M["response"] | undefined)[]
  >();
  const message: RequestMessage<M> = {
    key,
    request,
  };

  chrome.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
    const promises: Promise<M["response"]>[] = [];
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        const [promise, resolve, reject] = createPromise<M["response"]>();
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
