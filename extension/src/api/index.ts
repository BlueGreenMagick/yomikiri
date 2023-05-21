import type { MessageMap, Request, Response } from "./message";
import Utils from "~/utils";

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
type RequestResponse<K extends keyof MessageMap> =
  | SuccessfulRequestResponse<Response<K>>
  | FailedRequestResponse;

export type RequestHandler<K extends keyof MessageMap> = (
  request: Request<K>,
  sender: chrome.runtime.MessageSender
) => Response<K> | Promise<Response<K>>;

export type StorageHandler = (change: chrome.storage.StorageChange) => void;

export default class Api {
  static isIOS: boolean;
  static isTouchScreen: boolean = navigator.maxTouchPoints > 0;
  static isNoHover: boolean = window.matchMedia("(hover: none)").matches;

  static async initialize() {
    await Api.loadPlatform();
    attachRequestHandler();
    attachStorageChangeHandler();
  }

  /** Only works in background context */
  static loadPlatform(): Promise<void> {
    const [promise, resolve, reject] = Utils.createPromise<void>();
    chrome.runtime.getPlatformInfo((platform) => {
      // @ts-ignore
      Api.isIOS = platform.os === "ios";
      resolve();
    });
    return promise;
  }

  static requestHandlers: Partial<{
    [K in keyof MessageMap]: RequestHandler<K>;
  }> = {};

  static storageHandlers: {
    [key: string]: StorageHandler[];
  } = {};

  static storage(): chrome.storage.StorageArea {
    return chrome.storage.sync;
  }

  private static createRequestResponseHandler<K extends keyof MessageMap>(
    resolve: Utils.PromiseResolver<Response<K>>,
    reject: (reason: Error) => void
  ): (resp: RequestResponse<K>) => void {
    return (resp: RequestResponse<K>) => {
      if (resp.success) {
        resolve(resp.resp);
      } else {
        const obj = JSON.parse(resp.error);
        const error = new Error();
        for (const key in obj.getOwnPropertyNames()) {
          // @ts-ignore
          error[key] = obj[key];
        }
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
    chrome.runtime.sendMessage(
      message,
      Api.createRequestResponseHandler(resolve, reject)
    );
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
  /// There must not be duplicate handlers for a certain `key`.
  static handleRequest<K extends keyof MessageMap>(
    key: K,
    handler: RequestHandler<K>
  ) {
    // @ts-ignore
    Api.requestHandlers[key] = handler;
  }

  static async requestToApp(
    key: string,
    message: { [key: string]: any }
  ): Promise<any> {
    return browser.runtime.sendNativeMessage("_", {
      ...message,
      key,
    });
  }

  static async currentTab(): Promise<chrome.tabs.Tab> {
    const [promise, resolve, reject] = Utils.createPromise<chrome.tabs.Tab>();
    const info = {
      active: true,
      currentWindow: true,
    };
    try {
      chrome.tabs.query(info, (result: chrome.tabs.Tab[]) => {
        resolve(result[0]);
      });
    } catch (e) {
      reject(e);
    }
    return promise;
  }

  static async getStorage<T>(key: string, or?: T): Promise<T> {
    const [promise, resolve, reject] = Utils.createPromise<T>();
    let req: string | { [key: string]: T } = key;
    if (or !== undefined) {
      req = {};
      req[key] = or;
    }
    try {
      // @ts-ignore
      Api.storage().get(req, (obj) => {
        resolve(obj[key]);
      });
    } catch (e) {
      reject(e);
    }
    return promise;
  }

  /** value must be a JSON-stringifiable object */
  static async setStorage(key: string, value: any) {
    const [promise, resolve, reject] = Utils.createPromise<void>();
    const object: { [key: string]: any } = {};
    object[key] = value;
    try {
      Api.storage().set(object, resolve);
    } catch (e) {
      reject(e);
    }
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
      sendResponse: (response?: RequestResponse<keyof MessageMap>) => void
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
