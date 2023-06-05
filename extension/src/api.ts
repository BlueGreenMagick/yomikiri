import type { Entry } from "~/dictionary";
import type { NoteData } from "~/anki";
import type { Token } from "~/platform/types/tokenizer";
import type { AnkiInfo } from "~/platform/ios/anki";
import type { TokenizeRequest, TokenizeResult } from "~/tokenizer";
import Utils from "~/utils";

/**
 * Type map for messages between extension processes
 * Format: `{ key: [request, response] }`
 * Response type must not have Promise
 * Request type cannot be void, but response can be void
 */
export interface MessageMap {
  searchTerm: [string, Entry[]];
  tokenize: [TokenizeRequest, TokenizeResult];
  /** Note -> nid */
  addAnkiNote: [NoteData, number];
}

/** Type map for messages sent with `requestToApp()`*/
export interface AppMessageMap {
  tokenize: [string, Token[]];
  addNote: [NoteData, number];
  ankiInfo: [null, AnkiInfo];
}

export type Request<K extends keyof MessageMap> = Utils.First<MessageMap[K]>;
export type Response<K extends keyof MessageMap> = Utils.Second<MessageMap[K]>;
export type AppRequest<K extends keyof AppMessageMap> = Utils.First<
  AppMessageMap[K]
>;
export type AppResponse<K extends keyof AppMessageMap> = Utils.Second<
  AppMessageMap[K]
>;

interface Message<K extends keyof MessageMap> {
  key: K;
  request: Request<K>;
}

interface SuccessfulRequestResponse<R> {
  success: true;
  resp: R;
}
interface FailedRequestResponse {
  success: false;
  error: string; // JSON.stringify(error)
}
type RequestResponse<R> = SuccessfulRequestResponse<R> | FailedRequestResponse;

export type RequestHandler<K extends keyof MessageMap> = (
  request: Request<K>,
  sender: chrome.runtime.MessageSender
) => Response<K> | Promise<Response<K>>;

export type StorageHandler = (change: chrome.storage.StorageChange) => void;

export interface ApiInitializeOptions {
  /** Only for extension pages. Content scritps cannot access tabs api. */
  tab?: boolean;
  handleRequests?: boolean;
  handleStorageChange?: boolean;
}

export default class Api {
  static isTouchScreen: boolean = navigator.maxTouchPoints > 0;
  static tabId?: number;

  static async initialize(opts: ApiInitializeOptions) {
    if (opts.handleRequests) {
      attachRequestHandler();
    }
    if (opts.handleStorageChange) {
      attachStorageChangeHandler();
    }
    if (opts.tab) {
      this.tabId = (await Api.currentTab()).id;
    }
  }

  static requestHandlers: Partial<{
    [K in keyof MessageMap]: RequestHandler<K>;
  }> = {};

  static storageHandlers: {
    [key: string]: StorageHandler[];
  } = {};

  static storage(): chrome.storage.StorageArea {
    return chrome.storage.local;
  }

  private static handleRequestResponse<R>(resp: RequestResponse<R>): R {
    if (resp.success) {
      return resp.resp;
    } else {
      let obj;
      if (typeof resp.error === "string") {
        obj = JSON.parse(resp.error);
      } else {
        obj = resp.error;
      }
      const error = new Error();
      for (const key of Object.getOwnPropertyNames(obj)) {
        // @ts-ignore
        error[key] = obj[key];
      }
      throw error;
    }
  }

  private static createRequestResponseHandler<K extends keyof MessageMap>(
    resolve: Utils.PromiseResolver<Response<K>>,
    reject: (reason: Error) => void
  ): (resp: RequestResponse<Response<K>>) => void {
    return (resp: RequestResponse<Response<K>>) => {
      try {
        let response = Api.handleRequestResponse(resp);
        resolve(response);
      } catch (error: any) {
        reject(error);
      }
    };
  }

  /// Send request to extension backend.
  /// Returns the return value of the request handler.
  static async request<K extends keyof MessageMap>(
    key: K,
    request: Request<K>
  ): Promise<Response<K>> {
    const [promise, resolve, reject] = Utils.createPromise<Response<K>>();
    const message = {
      key,
      request,
    };
    const handler = Api.createRequestResponseHandler(resolve, reject);
    chrome.runtime.sendMessage(message, handler);
    return promise;
  }

  /// Send request to extension backend.
  /// Returns the return value of the request handler.
  static async requestToTab<K extends keyof MessageMap>(
    tabId: number,
    key: K,
    request: Request<K>
  ): Promise<Response<K>> {
    const [promise, resolve, reject] = Utils.createPromise<Response<K>>();
    const message = {
      key,
      request,
    };
    chrome.tabs.sendMessage(
      tabId,
      message,
      Api.createRequestResponseHandler(resolve, reject)
    );
    return promise;
  }

  /// Handle request by front-end for `key`. Return response in handler.
  /// If there is an existing handler for `key`, replaces it.
  static handleRequest<K extends keyof MessageMap>(
    key: K,
    handler: RequestHandler<K>
  ) {
    // @ts-ignore
    Api.requestHandlers[key] = handler;
  }

  /** Only supported in iOS */
  static async requestToApp<K extends keyof AppMessageMap>(
    key: K,
    request: AppRequest<K>
  ): Promise<AppResponse<K>> {
    const resp = await browser.runtime.sendNativeMessage("_", {
      key,
      request: JSON.stringify(request),
    });
    const response = Api.handleRequestResponse<string>(resp);
    return JSON.parse(response) as AppResponse<K>;
  }

  /** Must be called from within a tab, and not in a content script */
  static async currentTab(): Promise<chrome.tabs.Tab> {
    const [promise, resolve, reject] = Utils.createPromise<chrome.tabs.Tab>();
    chrome.tabs.getCurrent((result: chrome.tabs.Tab | undefined) => {
      if (result === undefined) {
        reject(new Error("currentTab() must be called from a tab context."));
      } else {
        resolve(result);
      }
    });
    return promise;
  }

  /** Must not be called from a content script. */
  static async activeTab(): Promise<chrome.tabs.Tab> {
    const [promise, resolve] = Utils.createPromise<chrome.tabs.Tab>();
    const info = {
      active: true,
      currentWindow: true,
    };

    chrome.tabs.query(info, (result: chrome.tabs.Tab[]) => {
      resolve(result[0]);
    });
    return promise;
  }

  static async goToTab(tabId: number): Promise<void> {
    const [promise, resolve] = Utils.createPromise<void>();
    chrome.tabs.update(tabId, { active: true }, () => {
      resolve();
    });
    return promise;
  }

  static async removeTab(tabId: number): Promise<void> {
    const [promise, resolve] = Utils.createPromise<void>();
    chrome.tabs.remove(tabId, () => {
      resolve();
    });
    return promise;
  }

  static async getStorage<T>(key: string, or?: T): Promise<T> {
    const [promise, resolve] = Utils.createPromise<T>();
    let req: string | { [key: string]: T } = key;
    if (or !== undefined) {
      req = {};
      req[key] = or;
    }
    Api.storage().get(req, (obj) => {
      resolve(obj[key]);
    });
    return promise;
  }

  /** value cannot be undefined or null */
  static async setStorage(key: string, value: NonNullable<any>) {
    const [promise, resolve] = Utils.createPromise<void>();
    const object: { [key: string]: any } = {};
    object[key] = value;
    Api.storage().set(object, resolve);
    return promise;
  }

  static async removeStorage(key: string) {
    const [promise, resolve] = Utils.createPromise<void>();
    Api.storage().remove(key, resolve);
    return promise;
  }

  static async handleStorageChange(key: string, handler: StorageHandler) {
    if (Api.storageHandlers[key] === undefined) {
      Api.storageHandlers[key] = [handler];
    } else {
      Api.storageHandlers[key].push(handler);
    }
  }
}

function attachRequestHandler() {
  chrome.runtime.onMessage.addListener(
    (
      message: Message<keyof MessageMap>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (
        response?: RequestResponse<Response<keyof MessageMap>>
      ) => void
    ): boolean => {
      let handler = Api.requestHandlers[message.key];
      if (handler) {
        (async () => {
          try {
            // @ts-ignore
            let resp = handler(message.request, sender);
            let realResp = resp instanceof Promise ? await resp : resp;
            sendResponse({
              success: true,
              resp: realResp,
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
    }
  );
}

function attachStorageChangeHandler() {
  Api.storage().onChanged.addListener((changes) => {
    for (const key in changes) {
      const handlers = Api.storageHandlers[key];
      if (handlers === undefined) continue;
      for (const handler of handlers) {
        handler(changes[key]);
      }
    }
  });
}
