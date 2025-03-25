/*
Terminology for messaging:
- MessageRequest: request body of message
- RequestMessage: message frame containing actual request
*/

import type { AnkiNote } from "@/lib/anki";
import type {
  DictionaryMetadata,
  SearchRequest,
  TokenizeRequest,
  TokenizeResult,
} from "#platform/backend";
import type { StoredConfiguration } from "../config";
import type { TranslateResult } from "../../platform/common/translate";
import type { TTSRequest, TTSVoice } from "@/platform/common";
import {
  createPromise,
  handleResponseMessage,
  type ResponseMessage,
  type Satisfies,
  type Thennable,
  type PromiseResolver,
  type First,
  type Second,
} from "@/lib/utils";
import { EXTENSION_CONTEXT } from "consts";
import { YomikiriError } from "@/lib/error";
import type { StoredCompatConfiguration } from "@/lib/compat";

/**
 * Type map for messages between extension processes
 * Format: `{ key: [request, response] }`
 * Response type must not have Promise
 */
export interface MessageMap {
  searchTerm: [SearchRequest, TokenizeResult];
  tokenize: [TokenizeRequest, TokenizeResult];
  addAnkiNote: [AnkiNote, boolean];
  tabId: [void, number | undefined];
  translate: [string, TranslateResult];
  tts: [TTSRequest, void];
  migrateConfig: [void, StoredConfiguration];
  getDictMetadata: [void, DictionaryMetadata];
  // ios
  loadConfig: [void, StoredConfiguration];
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

/// Must not contain 'undefined'
interface StorageValues {
  config: StoredCompatConfiguration;
  // desktop
  "deferred-anki-note": AnkiNote[];
  "deferred-anki-note-errors": string[];
  "dict.schema_ver": number;
  /** ETag of jmdict response */
  "dict.jmdict.etag": string;
  "dict.jmnedict.etag": string;
  // ios
  "x-callback.tabId": number;
  "x-callback.tabUrl": string;
}

export type StorageKey = keyof StorageValues;

/** list of keys that is used for connection */
type ConnectionKey = "updateDictionary";
type ConnectionHandler = (port: chrome.runtime.Port) => void;

const _messageHandlers: {
  [K in keyof MessageMap]?: MessageHandler<K>;
} = {};

const _storageHandlers: Record<string, StorageHandler[]> = {};

let _tabId: number | undefined;

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

export async function currentTabId(): Promise<number> {
  if (_tabId === undefined) {
    const tab = await currentTab();
    if (tab.id === undefined) {
      throw new YomikiriError("Current tab does not have an id");
    }
    _tabId = tab.id;
  }
  return _tabId;
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
      reject(YomikiriError.from(error));
    }
  };
}

type SimpleMessageHandlers = {
  [K in keyof MessageMap]: (
    request: MessageRequest<K>,
  ) => MessageResponse<K> | Promise<MessageResponse<K>>;
};

/**
 * Returns a function that:
 * - If in background context: runs `fn`
 * - Else: Sends a message to background to run `fn`.
 *
 * If in background, it attaches a message handler that executes `fn`.
 */
export function BackgroundFunction<K extends keyof MessageMap>(
  messageKey: K,
  fn: SimpleMessageHandlers[K],
) {
  if (EXTENSION_CONTEXT === "background") {
    handleMessage(messageKey, fn);
  }

  return async function inner(arg: MessageRequest<K>) {
    if (EXTENSION_CONTEXT !== "background") {
      return await message(messageKey, arg);
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
export function NonContentScriptFunction<K extends keyof MessageMap>(
  messageKey: K,
  fn: SimpleMessageHandlers[K],
) {
  if (EXTENSION_CONTEXT === "background") {
    handleMessage(messageKey, fn);
  }

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
      reject(new YomikiriError("No tabs are active"));
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
      reject(new YomikiriError("Could not get current tab"));
    } else {
      resolve(result);
    }
  });
  return promise;
}

/**
 * `or = undefined` is returned if storage value is `undefined` of not set.
 */
export async function getStorage<K extends StorageKey, V = undefined>(
  key: K,
  or?: V,
): Promise<StorageValues[K] | V> {
  const [promise, resolve] = createPromise<StorageValues[K] | V>();
  browserStorage().get(key, (obj) => {
    const value = obj[key] as StorageValues[K] | undefined;
    if (or !== undefined && value === undefined) {
      resolve(or);
    } else {
      resolve(value as StorageValues[K]);
    }
  });
  return promise;
}

export async function setStorage<K extends keyof StorageValues>(
  key: K,
  value: StorageValues[K],
) {
  const [promise, resolve] = createPromise<void>();
  const object: Record<string, unknown> = {};
  object[key] = value;
  browserStorage().set(object, resolve);
  return promise;
}

export async function removeStorage<K extends keyof StorageValues>(key: K) {
  const [promise, resolve] = createPromise<void>();
  browserStorage().remove(key, resolve);
  return promise;
}

export function handleStorageChange(key: string, handler: StorageHandler) {
  const storageHandlers = _storageHandlers[key];
  if (storageHandlers !== undefined) {
    storageHandlers.push(handler);
  } else {
    _storageHandlers[key] = [handler];
  }
}

export function createConnection(name: ConnectionKey) {
  return chrome.runtime.connect({ name });
}

export function handleConnection(
  name: ConnectionKey,
  handler: ConnectionHandler,
) {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== name) return;
    handler(port);
  });
}

export function handleInstall(
  handler: (details: chrome.runtime.InstalledDetails) => void,
) {
  chrome.runtime.onInstalled.addListener(handler);
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

browserStorage().onChanged.addListener((changes) => {
  for (const key in changes) {
    const handlers = _storageHandlers[key];
    if (handlers === undefined) continue;
    for (const handler of handlers) {
      handler(changes[key]);
    }
  }
});
