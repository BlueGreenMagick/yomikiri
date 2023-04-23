import type { MessageMap } from "./message";

type First<T extends any[]> = T extends [infer FIRST, ...any[]] ? FIRST : never;
type Second<T extends any[]> = T extends [any, infer SECOND, ...any[]] ? SECOND : never;

export type Request<K extends keyof MessageMap> = First<MessageMap[K]>
export type Response<K extends keyof MessageMap> = Second<MessageMap[K]>

interface Message<K extends keyof MessageMap> {
    key: K,
    request: Request<K>
}

interface SuccessfulRequestResponse<R> {
    success: true;
    resp: R;
}
interface FailedRequestResponse {
    success: false;
    resp: Error;
}
type RequestResponse<K extends keyof MessageMap> = SuccessfulRequestResponse<Response<K>> | FailedRequestResponse;

export type RequestHandler<K extends keyof MessageMap> = (request: Request<K>, respond: (response?: Response<K>) => void, sender?: chrome.runtime.MessageSender) => void;

export default class Api {
    static requestHandlers: Partial<{ [K in keyof MessageMap]: RequestHandler<K> }> = {};

    /// Wrapper for chrome.runtime.sendMessage
    static async request<K extends keyof MessageMap>(key: K, request: Request<K>): Promise<any> {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        })
        const message = {
            key, request
        }
        chrome.runtime.sendMessage(message, (resp: RequestResponse<K>) => {
            if (resp.success) {
                resolve(resp.resp);
            } else {
                reject(resp.resp);
            }
        });
        return promise;
    }

    /// Wrapper for chrome.runtime.onMessage.addListener
    /// Each key can have only one handler.
    static addRequestHandler<K extends keyof MessageMap>(key: K, handler: RequestHandler<K>) {
        Api.requestHandlers[key] = handler;
    }
}


function attachRequestHandler() {
    chrome.runtime.onMessage.addListener((message: Message<keyof MessageMap>, sender: chrome.runtime.MessageSender, sendResponse: (response?: RequestResponse<keyof MessageMap>) => void) => {
        let handler = Api.requestHandlers[message.key];
        if (handler) {
            try {
                const respond = (resp: any) => {
                    sendResponse({
                        success: true,
                        resp: resp
                    })
                }
                handler(message.request, respond, sender);
            }
            catch (e) {
                sendResponse({
                    success: false,
                    resp: e
                })
            }
        }
    });
}

attachRequestHandler();