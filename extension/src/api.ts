import type { Entry } from "~/dicEntry";
import type { NoteData } from "~/ankiNoteBuilder";
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
  addAnkiNote: [NoteData, void];
  tabId: [null, number | undefined];
}

/** Type map for messages sent with `requestToApp()`*/
export interface AppMessageMap {
  tokenize: [string, Token[]];
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

export type MessageSender = chrome.runtime.MessageSender;

export type RequestHandler<K extends keyof MessageMap> = (
  request: Request<K>,
  sender: MessageSender
) => Response<K> | Promise<Response<K>>;

export type StorageHandler = (change: chrome.storage.StorageChange) => void;

export type ExecutionContext = "contentScript" | "background" | "page";

export type Port = chrome.runtime.Port;

export interface ApiInitializeOptions {
  handleRequests?: boolean;
  handleStorageChange?: boolean;
  handleConnection?: boolean;
  context: ExecutionContext;
}

export namespace Api {
  export const isTouchScreen: boolean = navigator.maxTouchPoints > 0;
  export let context: ExecutionContext;
  let _tabId: number | undefined;

  export async function initialize(opts: ApiInitializeOptions) {
    if (opts.handleRequests) {
      attachRequestHandler();
    }
    if (opts.handleStorageChange) {
      attachStorageChangeHandler();
    }
    if (opts.handleConnection) {
      attachConnectionHandler();
    }
    // @ts-ignore
    context = opts.context;
  }

  const _requestHandlers: Partial<{
    [K in keyof MessageMap]: RequestHandler<K>;
  }> = {};

  const _storageHandlers: {
    [key: string]: StorageHandler[];
  } = {};

  export function storage(): chrome.storage.StorageArea {
    return chrome.storage.local;
  }

  function handleRequestResponse<R>(resp: RequestResponse<R>): R {
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

  function createRequestResponseHandler<K extends keyof MessageMap>(
    resolve: Utils.PromiseResolver<Response<K>>,
    reject: (reason: Error) => void
  ): (resp: RequestResponse<Response<K>>) => void {
    return (resp: RequestResponse<Response<K>>) => {
      try {
        let response = handleRequestResponse(resp);
        resolve(response);
      } catch (error: any) {
        reject(error);
      }
    };
  }

  /// Send request to extension backend.
  /// Returns the return value of the request handler.
  export async function request<K extends keyof MessageMap>(
    key: K,
    request: Request<K>
  ): Promise<Response<K>> {
    const [promise, resolve, reject] = Utils.createPromise<Response<K>>();
    const message = {
      key,
      request,
    };
    const handler = createRequestResponseHandler(resolve, reject);
    chrome.runtime.sendMessage(message, handler);
    return promise;
  }

  /// Send request to extension backend.
  /// Returns the return value of the request handler.
  export async function requestToTab<K extends keyof MessageMap>(
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
      createRequestResponseHandler(resolve, reject)
    );
    return promise;
  }

  /// Handle request by front-end for `key`. Return response in handler.
  /// If there is an existing handler for `key`, replaces it.
  export function handleRequest<K extends keyof MessageMap>(
    key: K,
    handler: RequestHandler<K>
  ) {
    // @ts-ignore
    _requestHandlers[key] = handler;
  }

  /** Only supported in iOS */
  export async function requestToApp<K extends keyof AppMessageMap>(
    key: K,
    request: AppRequest<K>
  ): Promise<AppResponse<K>> {
    const resp = await browser.runtime.sendNativeMessage("_", {
      key,
      request: JSON.stringify(request),
    });
    const response = handleRequestResponse<string>(resp);
    return JSON.parse(response) as AppResponse<K>;
  }

  /** Must be called from within a tab, and not in a content script */
  export async function currentTab(): Promise<chrome.tabs.Tab> {
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

  export async function currentTabId(): Promise<number> {
    if (_tabId === undefined) {
      const tab = await currentTab();
      if (tab.id === undefined) {
        throw new Error("Current tab does not have an id");
      }
      _tabId = tab.id;
    }
    return _tabId;
  }

  /** Must not be called from a content script. */
  export async function activeTab(): Promise<chrome.tabs.Tab> {
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

  export async function goToTab(tabId: number): Promise<void> {
    const [promise, resolve] = Utils.createPromise<void>();
    chrome.tabs.update(tabId, { active: true }, () => {
      resolve();
    });
    return promise;
  }

  export async function removeTab(tabId: number): Promise<void> {
    const [promise, resolve] = Utils.createPromise<void>();
    chrome.tabs.remove(tabId, () => {
      resolve();
    });
    return promise;
  }

  export async function updateTab(
    tabId: number,
    properties: chrome.tabs.UpdateProperties
  ): Promise<void> {
    const [promise, resolve] = Utils.createPromise<void>();
    chrome.tabs.update(tabId, properties, () => {
      resolve();
    });
    return promise;
  }

  export async function getStorage<T>(key: string, or?: T): Promise<T> {
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
  export async function setStorage(key: string, value: NonNullable<any>) {
    const [promise, resolve] = Utils.createPromise<void>();
    const object: { [key: string]: any } = {};
    object[key] = value;
    Api.storage().set(object, resolve);
    return promise;
  }

  export async function removeStorage(key: string) {
    const [promise, resolve] = Utils.createPromise<void>();
    Api.storage().remove(key, resolve);
    return promise;
  }

  export async function handleStorageChange(
    key: string,
    handler: StorageHandler
  ) {
    if (_storageHandlers[key] === undefined) {
      _storageHandlers[key] = [handler];
    } else {
      _storageHandlers[key].push(handler);
    }
  }

  type ConnectionKey = "dictionaryCheckInstall";
  type ConnectionHandler = (port: chrome.runtime.Port) => void;

  const _connectionHandlers: {
    [K in ConnectionKey]?: ConnectionHandler[];
  } = {};

  export function connect(name: ConnectionKey) {
    return chrome.runtime.connect({ name });
  }

  export function handleConnection(
    name: ConnectionKey,
    handler: ConnectionHandler
  ) {
    const handlers = _connectionHandlers[name];
    if (handlers === undefined) {
      _connectionHandlers[name] = [handler];
    } else {
      handlers.push(handler);
    }
  }

  function attachRequestHandler() {
    chrome.runtime.onMessage.addListener(
      (
        message: Message<keyof MessageMap>,
        sender: MessageSender,
        sendResponse: (
          response?: RequestResponse<Response<keyof MessageMap>>
        ) => void
      ): boolean => {
        let handler = _requestHandlers[message.key];
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
        const handlers = _storageHandlers[key];
        if (handlers === undefined) continue;
        for (const handler of handlers) {
          handler(changes[key]);
        }
      }
    });
  }

  function attachConnectionHandler() {
    chrome.runtime.onConnect.addListener((port) => {
      if (!_connectionHandlers.hasOwnProperty(port.name)) return;
      const handlers = _connectionHandlers[port.name as ConnectionKey];
      if (handlers === undefined) return;
      for (const handler of handlers) {
        handler(port);
      }
    });
  }
}
