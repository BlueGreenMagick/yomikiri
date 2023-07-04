import type Utils from "~/utils";
import type { Module } from "../types";
import type { AnkiInfo } from "./anki";

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = true;

  interface MessageWebviewMap {
    ankiIsInstalled: [null, boolean];
    ankiInfo: [null, AnkiInfo];
  }

  export type WebviewRequest<K extends keyof MessageWebviewMap> = Utils.First<
    MessageWebviewMap[K]
  >;
  export type WebviewResponse<K extends keyof MessageWebviewMap> = Utils.Second<
    MessageWebviewMap[K]
  >;

  /** Message to app inside app's WKWebview */
  export function messageWebview<K extends keyof MessageWebviewMap>(
    key: K,
    request: WebviewRequest<K>
  ): WebviewResponse<K> {
    const message = {
      key,
      request,
    };
    // @ts-ignore
    return window.webkit.messageHandlers.yomikiri.postMessage(
      message
    ) as WebviewResponse<K>;
  }
}

Platform satisfies Module;
