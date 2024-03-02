import type { Entry } from "~/dicEntry";
import type { NoteData } from "~/ankiNoteBuilder";
import type { TokenizeRequest, TokenizeResult } from "@platform/backend";
import Utils from "~/utils";
import type { StoredConfiguration } from "../config";
import type { TranslateResult } from "../translate";
import { MANIFEST_V3, TARGET } from "~/consts";

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
  stateEnabledChanged: [boolean, void];
  translate: [string, TranslateResult];
  // ios
  loadConfig: [null, StoredConfiguration];
  saveConfig: [StoredConfiguration, void];
}

export type Request<K extends keyof MessageMap> = Utils.First<MessageMap[K]>;
export type Response<K extends keyof MessageMap> = Utils.Second<MessageMap[K]>;

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

/**
 * The methods are loaded, but they should not be called
 * in a non-extension context
 */
export namespace BrowserApi {
  export let context: ExecutionContext;
  let _tabId: number | undefined;

  export function initialize(options: ApiInitializeOptions) {
    const opts: ApiInitializeOptions = {
      handleRequests: true,
      ...options,
    };

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

  /** returns chrome.action on manifest v3, and chrome.browserAction on manifest v2 */
  function action(): typeof chrome.action {
    return chrome.action ?? chrome.browserAction
  }

  export function storage(): chrome.storage.StorageArea {
    return chrome.storage.local;
  }

  export function manifest(): chrome.runtime.Manifest {
    return chrome.runtime.getManifest();
  }

  /** Returns content of the response. Returns an Error object if an error occured. */
  export function handleRequestResponse<R>(resp: RequestResponse<R>): R {
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

  /** It is assumed that request does return a response. */
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

  /**
   * Send request to all extension pages.
   * Returns the return value of the request handler.
   *
   * Request is not sent to content scripts. Use `requestToTab()` instead.
   */
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

  /** Send request to page and content script in tab. */
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

  /** Responses may contain undefined if a tab did not handle request */
  export async function requestToAllTabs<K extends keyof MessageMap>(
    key: K,
    request: Request<K>
  ): Promise<(Response<K> | undefined)[]> {
    const [outerPromise, outerResolve, outerReject] =
      Utils.createPromise<(Response<K> | undefined)[]>();
    const message = {
      key,
      request,
    };

    chrome.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
      let promises: Promise<Response<K>>[] = [];
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          const [promise, resolve, reject] = Utils.createPromise<Response<K>>();
          const handler = createRequestResponseHandler(resolve, reject);
          chrome.tabs.sendMessage(tab.id, message, (resp) => {
            if (
              resp === undefined ||
              chrome.runtime.lastError?.message?.includes(
                "Could not establish connection. Receiving end does not exist."
              )
            ) {
              resolve(resp);
            } else if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError.message);
            } else {
              handler(resp);
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
  export function handleRequest<K extends keyof MessageMap>(
    key: K,
    handler: RequestHandler<K>
  ) {
    // @ts-ignore
    _requestHandlers[key] = handler;
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
    BrowserApi.storage().get(req, (obj) => {
      resolve(obj[key]);
    });
    return promise;
  }

  /** value cannot be undefined or null */
  export async function setStorage(key: string, value: NonNullable<any>) {
    const [promise, resolve] = Utils.createPromise<void>();
    const object: { [key: string]: any } = {};
    object[key] = value;
    BrowserApi.storage().set(object, resolve);
    return promise;
  }

  export async function removeStorage(key: string) {
    const [promise, resolve] = Utils.createPromise<void>();
    BrowserApi.storage().remove(key, resolve);
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


  // set text to "" to remove badge
  export function setBadge(text: string | number, color: string) {
    const iAction = action();
    if (typeof text === "number") {
      text = text.toString()
    }
    iAction.setBadgeText({
      text
    })
    iAction.setBadgeBackgroundColor({
      color
    });
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
              let resp = await handler(message.request, sender);
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
      }
    );
  }

  function attachStorageChangeHandler() {
    BrowserApi.storage().onChanged.addListener((changes) => {
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
