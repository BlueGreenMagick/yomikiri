/*
Terminology for messaging:
- MessageRequest: request body of message
- RequestMessage: message frame containing actual request
*/

import type { AnkiNote } from "lib/anki";
import type {
  SearchRequest,
  TokenizeRequest,
  TokenizeResult,
} from "@platform/backend";
import type { StoredConfiguration } from "../lib/config";
import type { TranslateResult } from "../platform/common/translate";
import type { TTSRequest, TTSVoice } from "platform/common";
import {
  createPromise,
  handleResponseMessage,
  hasOwnProperty,
  getErrorMessage,
  type ResponseMessage,
  type Satisfies,
  type Thennable,
  type PromiseResolver,
  type First,
  type Second,
} from "lib/utils";
import { EXTENSION_CONTEXT } from "consts";

/**
 * Type map for messages between extension processes
 * Format: `{ key: [request, response] }`
 * Response type must not have Promise
 * Request type cannot be void, but response can be void
 */
export interface MessageMap {
  searchTerm: [SearchRequest, TokenizeResult];
  tokenize: [TokenizeRequest, TokenizeResult];
  addAnkiNote: [AnkiNote, boolean];
  tabId: [null, number | undefined];
  translate: [string, TranslateResult];
  tts: [TTSRequest, void];
  migrateConfig: [null, StoredConfiguration];
  // ios
  loadConfig: [null, StoredConfiguration];
  saveConfig: [StoredConfiguration, void];
  setActionIcon: [null, void];
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

export type MessageHandler<K extends keyof MessageMap> = (
  request: MessageRequest<K>,
  sender: MessageSender,
) => MessageResponse<K> | Promise<MessageResponse<K>>;

export type StorageHandler = (change: chrome.storage.StorageChange) => void;

export type ExecutionContext =
  | "contentScript"
  | "background"
  | "page"
  | "popup";

export type Port = chrome.runtime.Port;

export interface ApiInitializeOptions {
  handleRequests?: boolean;
  handleStorageChange?: boolean;
  handleConnection?: boolean;
  context: ExecutionContext;
}

type ConnectionKey = "updateDictionary";
type ConnectionHandler = (port: chrome.runtime.Port) => void;

const _messageHandlers: {
  [K in keyof MessageMap]?: MessageHandler<K>;
} = {};

export class BrowserApi {
  readonly context: ExecutionContext;
  private tabId: number | undefined;

  private _storageHandlers: Record<string, StorageHandler[]> = {};
  private _connectionHandlers: {
    [K in ConnectionKey]?: ConnectionHandler[];
  } = {};

  /** Must be initialized in initial synchronous run */
  constructor(options: ApiInitializeOptions) {
    const opts: ApiInitializeOptions = {
      handleStorageChange: true,
      handleConnection: options.context === "background",
      ...options,
    };
    this.context = opts.context;

    if (opts.handleStorageChange) {
      this.attachStorageChangeHandler();
    }
    if (opts.handleConnection) {
      this.attachConnectionHandler();
    }
  }

  private attachStorageChangeHandler() {
    browserStorage().onChanged.addListener((changes) => {
      for (const key in changes) {
        const handlers = this._storageHandlers[key];
        if (handlers === undefined) continue;
        for (const handler of handlers) {
          handler(changes[key]);
        }
      }
    });
  }

  private attachConnectionHandler() {
    chrome.runtime.onConnect.addListener((port) => {
      if (!hasOwnProperty(this._connectionHandlers, port.name)) return;
      const handlers = this._connectionHandlers[port.name];
      if (handlers === undefined) return;
      for (const handler of handlers) {
        handler(port);
      }
    });
  }

  async currentTabId(): Promise<number> {
    if (this.tabId === undefined) {
      const tab = await currentTab();
      if (tab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      this.tabId = tab.id;
    }
    return this.tabId;
  }

  /**
   * Assumption:
   * `storage[key]?: T`
   */
  async getStorage<T>(key: string, or?: T): Promise<T> {
    const [promise, resolve] = createPromise<T>();
    let req: string | Record<string, T> = key;
    if (or !== undefined) {
      req = {
        [key]: or,
      };
    }
    browserStorage().get(req, (obj) => {
      resolve(obj[key] as T);
    });
    return promise;
  }

  /** value cannot be undefined or null */
  async setStorage(key: string, value: NonNullable<unknown>) {
    const [promise, resolve] = createPromise<void>();
    const object: Record<string, unknown> = {};
    object[key] = value;
    browserStorage().set(object, resolve);
    return promise;
  }

  async removeStorage(key: string) {
    const [promise, resolve] = createPromise<void>();
    browserStorage().remove(key, resolve);
    return promise;
  }

  handleStorageChange(key: string, handler: StorageHandler) {
    const storageHandlers = this._storageHandlers[key];
    if (storageHandlers !== undefined) {
      storageHandlers.push(handler);
    } else {
      this._storageHandlers[key] = [handler];
    }
  }

  connect(name: ConnectionKey) {
    return chrome.runtime.connect({ name });
  }

  handleConnection(name: ConnectionKey, handler: ConnectionHandler) {
    const handlers = this._connectionHandlers[name];
    if (handlers === undefined) {
      this._connectionHandlers[name] = [handler];
    } else {
      handlers.push(handler);
    }
  }
}

/** returns chrome.action on manifest v3, and chrome.browserAction on manifest v2 */
export function browserAction():
  | typeof chrome.action
  | typeof chrome.browserAction {
  return chrome.action ?? chrome.browserAction;
}

export function browserStorage(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

export function extensionManifest(): chrome.runtime.Manifest {
  return chrome.runtime.getManifest();
}

export async function setActionIcon(iconPath: string) {
  await browserAction().setIcon({
    path: iconPath,
  });
}

export function handleActionClicked(handler: (tab: chrome.tabs.Tab) => void) {
  browserAction().onClicked.addListener(handler);
}

export function handleBrowserLoad(handler: () => void) {
  chrome.runtime.onStartup.addListener(handler);
}

/** set text to "" to remove badge */
export async function setBadge(text: string | number, color: string = "white") {
  const iAction = browserAction();
  if (typeof text === "number") {
    text = text.toString();
  }
  await iAction.setBadgeText({
    text,
  });
  await iAction.setBadgeBackgroundColor({
    color,
  });
}

export async function japaneseTtsVoices(): Promise<TTSVoice[]> {
  if (chrome.tts === undefined) {
    return [];
  }

  const [promise, resolve] = createPromise<chrome.tts.TtsVoice[]>();
  chrome.tts.getVoices(resolve);
  const voices = await promise;
  const ttsVoices: TTSVoice[] = [];
  for (const voice of voices) {
    if (voice.lang != "ja-JP") continue;
    const name = voice.voiceName;
    if (name === undefined) continue;
    const quality = voice.remote ? 100 : 200;
    const ttsVoice: TTSVoice = {
      id: name,
      name: name,
      quality,
    };
    ttsVoices.push(ttsVoice);
  }
  return ttsVoices;
}

export async function speakJapanese(
  text: string,
  voice: TTSVoice | null,
): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  let options: chrome.tts.SpeakOptions = { lang: "ja-jp" };
  if (voice !== null) {
    const voices = await japaneseTtsVoices();
    if (
      voices.find((value) => {
        value.name === voice.name;
      }) !== undefined
    ) {
      options = { voiceName: voice.name };
    }
  }
  chrome.tts.speak(text, options, resolve);
  return promise;
}

/// Handle message by front-end for `key`. Return response in handler.
/// If there is an existing handler for `key`, replaces it.
export function handleMessage<K extends keyof MessageMap>(
  key: K,
  handler: (typeof _messageHandlers)[K],
) {
  _messageHandlers[key] = handler;
}

/**
 * Send message to all extension pages.
 * Returns the return value of the message handler.
 *
 * Message is not sent to content scripts. Use `messageToTab()` instead.
 */
export async function message<K extends keyof MessageMap>(
  key: K,
  request: MessageRequest<K>,
): Promise<MessageResponse<K>> {
  const [promise, resolve, reject] = createPromise<MessageResponse<K>>();
  const message = {
    key,
    request,
  };
  const handler = createMessageResponseHandler(resolve, reject);
  const initialHandler = (
    resp: ResponseMessage<Second<MessageMap[K]>> | undefined,
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
  const [outerPromise, outerResolve, outerReject] =
    createPromise<(MessageResponse<K> | undefined)[]>();
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
function createMessageResponseHandler<K extends keyof MessageMap>(
  resolve: PromiseResolver<MessageResponse<K>>,
  reject: (reason: Error) => void,
): (resp: ResponseMessage<MessageResponse<K>>) => void {
  return (resp: ResponseMessage<MessageResponse<K>>) => {
    try {
      const response = handleResponseMessage(resp);
      resolve(response);
    } catch (error: unknown) {
      if (error instanceof Error) {
        reject(error);
      } else {
        reject(new Error(getErrorMessage(error)));
      }
    }
  };
}

type SimpleMessageHandlers = {
  [K in keyof MessageMap]: (
    request: MessageRequest<K>,
  ) => MessageResponse<K> | Promise<MessageResponse<K>>;
};

/**
 * This function is run only in background context.
 *
 * In other extension contexts, a message is sent to background to run the function.
 */
export function BackgroundFunction<K extends keyof MessageMap>(
  messageKey: K,
  fn: SimpleMessageHandlers[K],
) {
  handleMessage(messageKey, fn);

  return async function inner(arg: MessageRequest<K>) {
    if (EXTENSION_CONTEXT !== "background") {
      return await message(messageKey, arg);
    } else {
      return fn(arg);
    }
  };
}

/**
 * Only in content script, a message is sent to background to run the function.
 *
 * Function is run as-is in other contexts.
 */
export function NonContentScriptFunction<K extends keyof MessageMap>(
  messageKey: K,
  fn: SimpleMessageHandlers[K],
) {
  handleMessage(messageKey, fn);

  return async function inner(arg: MessageRequest<K>) {
    if (EXTENSION_CONTEXT === "contentScript") {
      return await message(messageKey, arg);
    } else {
      return fn(arg);
    }
  };
}

/** Must not be called from a content script. */
export async function activeTab(): Promise<chrome.tabs.Tab> {
  const [promise, resolve, reject] = createPromise<chrome.tabs.Tab>();
  const info = {
    active: true,
    currentWindow: true,
  };

  chrome.tabs.query(info, (result: chrome.tabs.Tab[]) => {
    if (result[0] !== undefined) {
      resolve(result[0]);
    } else {
      reject(new Error("No tabs are active"));
    }
  });
  return promise;
}

export async function getTabs(
  info: chrome.tabs.QueryInfo,
): Promise<chrome.tabs.Tab[]> {
  const [promise, resolve] = createPromise<chrome.tabs.Tab[]>();
  chrome.tabs.query(info, (tabs: chrome.tabs.Tab[]) => {
    resolve(tabs);
  });
  return promise;
}

export async function goToTab(tabId: number): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  chrome.tabs.update(tabId, { active: true }, () => {
    resolve();
  });
  return promise;
}

export async function removeTab(tabId: number): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  chrome.tabs.remove(tabId, () => {
    resolve();
  });
  return promise;
}

export async function updateTab(
  tabId: number,
  properties: chrome.tabs.UpdateProperties,
): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  chrome.tabs.update(tabId, properties, () => {
    resolve();
  });
  return promise;
}

/** Must be called from within a tab, and not in a content script */
export async function currentTab(): Promise<chrome.tabs.Tab> {
  const [promise, resolve, reject] = createPromise<chrome.tabs.Tab>();
  chrome.tabs.getCurrent((result: chrome.tabs.Tab | undefined) => {
    if (result === undefined) {
      reject(new Error("Could not get current tab"));
    } else {
      resolve(result);
    }
  });
  return promise;
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
    const handler = _messageHandlers[message.key];
    if (handler) {
      void (async () => {
        try {
          // @ts-expect-error complex types
          const resp = await handler(message.request, sender);
          sendResponse({
            success: true,
            resp,
          });
        } catch (e) {
          sendResponse({
            success: false,
            error: JSON.stringify(e, Object.getOwnPropertyNames(e)),
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
