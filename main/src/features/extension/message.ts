/*
Terminology for messaging:
- MessageRequest: request body of message
- RequestMessage: message frame containing actual request
*/

import type { AnkiNote } from "@/features/anki";
import type { StoredCompatConfiguration } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import { YomikiriError } from "@/features/error";
import {
  createPromise,
  type First,
  handleResponseMessage,
  type PromiseResolver,
  type ResponseMessage,
  type Satisfies,
  type Second,
  type Thennable,
} from "@/features/utils";
import type { TranslateResult } from "@/platform/shared/translate";
import type { JSONStorageValues, TTSRequest } from "@/platform/types";
import type {
  DictionaryMetadata,
  SearchRequest,
  TokenizeRequest,
  TokenizeResult,
} from "@/platform/types/backend";
import { EXTENSION_CONTEXT } from "consts";

/**
 * Type map for messages between extension processes
 * Format: `{ key: [request, response] }`
 * Response type must not have Promise
 */
export interface MessageMap {
  setStorageBatch: [JSONStorageValues, void];
  getStorageBatch: [string[], JSONStorageValues];
  searchTerm: [SearchRequest, TokenizeResult];
  tokenize: [TokenizeRequest, TokenizeResult];
  addAnkiNote: [AnkiNote, boolean];
  tabId: [void, number | undefined];
  translate: [string, TranslateResult];
  tts: [TTSRequest, void];
  migrateConfig: [void, StoredConfiguration];
  getDictMetadata: [void, DictionaryMetadata];
  // ios
  loadConfig: [void, StoredCompatConfiguration];
  saveConfig: [StoredConfiguration, void];
}

type _EnsureNoPromiseInMessageMap = Satisfies<
  MessageMap,
  {
    [key in keyof MessageMap]: [
      Exclude<MessageMap[key][0], Thennable>,
      Exclude<MessageMap[key][1], Thennable>,
    ];
  }
>;

export type MessageRequest<K extends keyof MessageMap> = First<MessageMap[K]>;
export type MessageResponse<K extends keyof MessageMap> = Second<MessageMap[K]>;

interface RequestMessage<K extends keyof MessageMap> {
  key: K;
  request: MessageRequest<K>;
}

export type MessageSender = chrome.runtime.MessageSender;

export type MessageHandler<Req, Resp> = (
  request: Req,
  sender: MessageSender,
) => Resp | Promise<Resp>;

export type MessageHandlerForKey<K extends keyof MessageMap> = MessageHandler<
  MessageRequest<K>,
  MessageResponse<K>
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _messageHandlers: Map<string, MessageHandler<any, unknown>> = new Map();

/// Handle message by front-end for `key`. Return response in handler.
/// If there is an existing handler for `key`, replaces it.
export function handleMessage<K extends keyof MessageMap>(
  key: K,
  handler: MessageHandlerForKey<K>,
) {
  if (_messageHandlers.has(key)) {
    console.error("Attaching duplicate message handler for: ", key);
  }
  _messageHandlers.set(key, handler);
}

export function handleMessageRaw<Req, Resp>(
  key: string,
  handler: MessageHandler<Req, Resp>,
) {
  if (_messageHandlers.has(key)) {
    console.error("Attaching duplicate message handler for: ", key);
  }
  _messageHandlers.set(key, handler);
}

async function sendMessageRaw<Resp>(key: string, request: unknown): Promise<Resp> {
  const [promise, resolve, reject] = createPromise<Resp>();
  const message = {
    key,
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

/**
 * Send message to all extension pages.
 * Returns the return value of the message handler.
 *
 * Message is not sent to content scripts. Use `messageToTab()` instead.
 */
export async function sendMessage<K extends keyof MessageMap>(
  key: K,
  request: MessageRequest<K>,
): Promise<MessageResponse<K>> {
  return sendMessageRaw(key, request);
}

/** Send message to page and content script in tab. */
export async function messageToTab<K extends keyof MessageMap>(
  tabId: number,
  key: K,
  request: MessageRequest<K>,
): Promise<MessageResponse<K>> {
  const [promise, resolve, reject] = createPromise<MessageResponse<K>>();
  const message = {
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
export async function messageToAllTabs<K extends keyof MessageMap>(
  key: K,
  request: MessageRequest<K>,
): Promise<(MessageResponse<K> | undefined)[]> {
  const [outerPromise, outerResolve, outerReject] = createPromise<
    (MessageResponse<K> | undefined)[]
  >();
  const message = {
    key,
    request,
  };

  chrome.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
    const promises: Promise<MessageResponse<K>>[] = [];
    for (const tab of tabs) {
      if (tab.id !== undefined) {
        const [promise, resolve, reject] = createPromise<MessageResponse<K>>();
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

/**
 * Returns a function that:
 * - If in background context: runs `fn`
 * - Else: Sends a message to background to run `fn`.
 *
 * If in background, it attaches a message handler that executes `fn`.
 */
export function BackgroundFunction<Req = void, Resp = void>(
  messageKey: string,
  fn: (req: Req) => Promise<Resp>,
): (arg: Req) => Promise<Resp> {
  if (EXTENSION_CONTEXT === "background") {
    handleMessageRaw(messageKey, fn);
  }

  return async function inner(arg: Req): Promise<Resp> {
    if (EXTENSION_CONTEXT !== "background") {
      return await sendMessageRaw(messageKey, arg) as Resp;
    } else {
      return fn(arg);
    }
  };
}

/**
 * Returns a function that:
 * - If in content script: sends a message to background to run `fn`
 * - Else: runs `fn` as-is.
 *
 * If in background, it attaches a message handler that executes `fn`.
 */
export function NonContentScriptFunction<Req = void, Resp = void>(
  messageKey: string,
  fn: (req: Req) => Promise<Resp>,
): (arg: Req) => Promise<Resp> {
  if (EXTENSION_CONTEXT === "background") {
    handleMessageRaw(messageKey, fn);
  }

  return async function inner(arg: Req): Promise<Resp> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return await sendMessageRaw(messageKey, arg);
    } else {
      return fn(arg);
    }
  };
}

chrome.runtime.onMessage.addListener(
  (
    message: RequestMessage<keyof MessageMap>,
    sender: MessageSender,
    sendResponse: (
      response?: ResponseMessage<MessageResponse<keyof MessageMap>>,
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
            resp: resp as MessageResponse<keyof MessageMap>,
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
