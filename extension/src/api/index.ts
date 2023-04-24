import type { MessageMap, Request, Response } from "./message";

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
  static requestHandlers: Partial<{
    [K in keyof MessageMap]: RequestHandler<K>;
  }> = {};

  /// Send request to extension backend.
  /// Returns the return value of the request handler.
  static async request<K extends keyof MessageMap>(
    key: K,
    request: Request<K>
  ): Promise<Response<K>> {
    let resolve, reject;
    const promise = new Promise((res: (value: Response<K>) => void, rej) => {
      resolve = res;
      reject = rej;
    });
    const message = {
      key,
      request,
    };
    chrome.runtime.sendMessage(message, (resp: RequestResponse<K>) => {
      if (resp.success) {
        resolve(resp.resp);
      } else {
        const obj = JSON.parse(resp.error);
        const error = new Error();
        for (const key in obj.getOwnPropertyNames()) {
          error[key] = obj[key];
        }
        reject(error);
      }
    });
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
}

function attachRequestHandler() {
  chrome.runtime.onMessage.addListener(
    async (
      message: Message<keyof MessageMap>,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: RequestResponse<keyof MessageMap>) => void
    ) => {
      let handler = Api.requestHandlers[message.key];
      if (handler) {
        try {
          let resp = handler(message.request, sender);
          let realResp = resp instanceof Promise ? await resp : resp;
          sendResponse({
            success: true,
            resp: realResp,
          });
        } catch (e) {
          console.error(`error while handling request '${message.key}':`, e);
          sendResponse({
            success: false,
            error: JSON.stringify(e, Object.getOwnPropertyNames(e)),
          });
        }
      }
    }
  );
}

attachRequestHandler();
