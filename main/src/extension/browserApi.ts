import type { Entry } from "lib/dicEntry";
import type { AnkiNote } from "lib/anki";
import type { TokenizeRequest, TokenizeResult } from "@platform/backend";
import type { StoredConfiguration } from "../lib/config";
import type { TranslateResult } from "../platform/common/translate";
import type { TTSRequest, TTSVoice } from "platform/common";
import Utils, {
  handleMessageResponse,
  hasOwnProperty,
  type MessageResponse,
  type Satisfies,
  type Thennable,
} from "lib/utils";

/**
 * Type map for messages between extension processes
 * Format: `{ key: [request, response] }`
 * Response type must not have Promise
 * Request type cannot be void, but response can be void
 */
export interface MessageMap {
  searchTerm: [string, Entry[]];
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

export type Request<K extends keyof MessageMap> = Utils.First<MessageMap[K]>;
export type Response<K extends keyof MessageMap> = Utils.Second<MessageMap[K]>;

interface Message<K extends keyof MessageMap> {
  key: K;
  request: Request<K>;
}

export type MessageSender = chrome.runtime.MessageSender;

export type RequestHandler<K extends keyof MessageMap> = (
  request: Request<K>,
  sender: MessageSender,
) => Response<K> | Promise<Response<K>>;

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

type ConnectionKey = "dictionaryCheckInstall";
type ConnectionHandler = (port: chrome.runtime.Port) => void;

export class BrowserApi {
  readonly context: ExecutionContext;
  private tabId: number | undefined;

  private _requestHandlers: {
    [K in keyof MessageMap]?: RequestHandler<K>;
  } = {};
  private _storageHandlers: Record<string, StorageHandler[]> = {};
  private _connectionHandlers: {
    [K in ConnectionKey]?: ConnectionHandler[];
  } = {};

  /** Must be initialized in initial synchronous run */
  constructor(options: ApiInitializeOptions) {
    const opts: ApiInitializeOptions = {
      handleRequests: true,
      handleStorageChange: true,
      ...options,
    };
    this.context = opts.context;

    if (opts.handleRequests) {
      this.attachRequestHandler();
    }
    if (opts.handleStorageChange) {
      this.attachStorageChangeHandler();
    }
    if (opts.handleConnection) {
      this.attachConnectionHandler();
    }
  }

  private attachRequestHandler() {
    chrome.runtime.onMessage.addListener(
      (
        message: Message<keyof MessageMap>,
        sender: MessageSender,
        sendResponse: (
          response?: MessageResponse<Response<keyof MessageMap>>,
        ) => void,
      ): boolean => {
        console.debug(message.key, message);
        const handler = this._requestHandlers[message.key];
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
  }

  private attachStorageChangeHandler() {
    this.storage().onChanged.addListener((changes) => {
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

  /** returns chrome.action on manifest v3, and chrome.browserAction on manifest v2 */
  action(): typeof chrome.action | typeof chrome.browserAction {
    return chrome.action ?? chrome.browserAction;
  }

  storage(): chrome.storage.StorageArea {
    return chrome.storage.local;
  }

  manifest(): chrome.runtime.Manifest {
    return chrome.runtime.getManifest();
  }

  /** It is assumed that request does return a response. */
  private createRequestResponseHandler<K extends keyof MessageMap>(
    resolve: Utils.PromiseResolver<Response<K>>,
    reject: (reason: Error) => void,
  ): (resp: MessageResponse<Response<K>>) => void {
    return (resp: MessageResponse<Response<K>>) => {
      try {
        const response = handleMessageResponse(resp);
        resolve(response);
      } catch (error: unknown) {
        if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error(Utils.getErrorMessage(error)));
        }
      }
    };
  }

  /**
   * Send request to all extension pages.
   * Returns the return value of the request handler.
   *
   * Request is not sent to content scripts. Use `requestToTab()` instead.
   */
  async request<K extends keyof MessageMap>(
    key: K,
    request: Request<K>,
  ): Promise<Response<K>> {
    const [promise, resolve, reject] = Utils.createPromise<Response<K>>();
    const message = {
      key,
      request,
    };
    const handler = this.createRequestResponseHandler(resolve, reject);
    chrome.runtime.sendMessage(message, handler);
    return promise;
  }

  /** Send request to page and content script in tab. */
  async requestToTab<K extends keyof MessageMap>(
    tabId: number,
    key: K,
    request: Request<K>,
  ): Promise<Response<K>> {
    const [promise, resolve, reject] = Utils.createPromise<Response<K>>();
    const message = {
      key,
      request,
    };
    chrome.tabs.sendMessage(
      tabId,
      message,
      this.createRequestResponseHandler(resolve, reject),
    );
    return promise;
  }

  /** Responses may contain undefined if a tab did not handle request */
  async requestToAllTabs<K extends keyof MessageMap>(
    key: K,
    request: Request<K>,
  ): Promise<(Response<K> | undefined)[]> {
    const [outerPromise, outerResolve, outerReject] =
      Utils.createPromise<(Response<K> | undefined)[]>();
    const message = {
      key,
      request,
    };

    chrome.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
      const promises: Promise<Response<K>>[] = [];
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          const [promise, resolve, reject] = Utils.createPromise<Response<K>>();
          const handler = this.createRequestResponseHandler(resolve, reject);
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
  /// Handle request by front-end for `key`. Return response in handler.
  /// If there is an existing handler for `key`, replaces it.
  handleRequest<K extends keyof MessageMap>(
    key: K,
    handler: (typeof this._requestHandlers)[K],
  ) {
    this._requestHandlers[key] = handler;
  }

  /** Must be called from within a tab, and not in a content script */
  async currentTab(): Promise<chrome.tabs.Tab> {
    const [promise, resolve, reject] = Utils.createPromise<chrome.tabs.Tab>();
    chrome.tabs.getCurrent((result: chrome.tabs.Tab | undefined) => {
      if (result === undefined) {
        reject(new Error("Could not get current tab"));
      } else {
        resolve(result);
      }
    });
    return promise;
  }

  async currentTabId(): Promise<number> {
    if (this.tabId === undefined) {
      const tab = await this.currentTab();
      if (tab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      this.tabId = tab.id;
    }
    return this.tabId;
  }

  /** Must not be called from a content script. */
  async activeTab(): Promise<chrome.tabs.Tab> {
    const [promise, resolve, reject] = Utils.createPromise<chrome.tabs.Tab>();
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

  async tabs(info: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    const [promise, resolve] = Utils.createPromise<chrome.tabs.Tab[]>();
    chrome.tabs.query(info, (tabs: chrome.tabs.Tab[]) => {
      resolve(tabs);
    });
    return promise;
  }

  async goToTab(tabId: number): Promise<void> {
    const [promise, resolve] = Utils.createPromise<void>();
    chrome.tabs.update(tabId, { active: true }, () => {
      resolve();
    });
    return promise;
  }

  async removeTab(tabId: number): Promise<void> {
    const [promise, resolve] = Utils.createPromise<void>();
    chrome.tabs.remove(tabId, () => {
      resolve();
    });
    return promise;
  }

  async updateTab(
    tabId: number,
    properties: chrome.tabs.UpdateProperties,
  ): Promise<void> {
    const [promise, resolve] = Utils.createPromise<void>();
    chrome.tabs.update(tabId, properties, () => {
      resolve();
    });
    return promise;
  }

  /**
   * Assumption:
   * `storage[key]?: T`
   */
  async getStorage<T>(key: string, or?: T): Promise<T> {
    const [promise, resolve] = Utils.createPromise<T>();
    let req: string | Record<string, T> = key;
    if (or !== undefined) {
      req = {
        [key]: or,
      };
    }
    this.storage().get(req, (obj) => {
      resolve(obj[key] as T);
    });
    return promise;
  }

  /** value cannot be undefined or null */
  async setStorage(key: string, value: NonNullable<unknown>) {
    const [promise, resolve] = Utils.createPromise<void>();
    const object: Record<string, unknown> = {};
    object[key] = value;
    this.storage().set(object, resolve);
    return promise;
  }

  async removeStorage(key: string) {
    const [promise, resolve] = Utils.createPromise<void>();
    this.storage().remove(key, resolve);
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

  /** set text to "" to remove badge */
  async setBadge(text: string | number, color: string = "white") {
    const iAction = this.action();
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

  async japaneseTtsVoices(): Promise<TTSVoice[]> {
    const [promise, resolve] = Utils.createPromise<chrome.tts.TtsVoice[]>();
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

  async speakJapanese(text: string, voice: TTSVoice | null): Promise<void> {
    const [promise, resolve] = Utils.createPromise<void>();
    let options: chrome.tts.SpeakOptions = { lang: "ja-jp" };
    if (voice !== null) {
      const voices = await this.japaneseTtsVoices();
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

  handleActionClicked(handler: (tab: chrome.tabs.Tab) => void) {
    chrome.action.onClicked.addListener(handler);
  }

  async setActionIcon(iconPath: string) {
    await chrome.action.setIcon({
      path: iconPath,
    });
  }

  handleBrowserLoad(handler: () => void) {
    chrome.runtime.onStartup.addListener(handler);
  }
}
