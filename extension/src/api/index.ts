import type { MessageMap, Request, Response } from "./message";
import Utils from "../utils";

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

export default class Api {
  static isSafariApi: boolean =
    navigator.userAgent.indexOf(" Safari/") !== -1 &&
    navigator.userAgent.indexOf(" Chrome/") === -1 &&
    navigator.userAgent.indexOf(" Chromium/") === -1;
  static isChromeApi: boolean =
    !Api.isSafariApi && typeof chrome !== "undefined";
  static isFirefoxOnAndroid: boolean =
    navigator.userAgent.indexOf("Firefox/") !== -1 &&
    navigator.userAgent.indexOf("Android") !== -1;

  static requestHandlers: Partial<{
    [K in keyof MessageMap]: RequestHandler<K>;
  }> = {};

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

  static async currentTab(): Promise<chrome.tabs.Tab> {
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

attachRequestHandler();
