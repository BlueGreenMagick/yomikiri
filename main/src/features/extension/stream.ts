/**
 * Abstraction for Chrome extension port-based connections that support streaming responses.
 * Provides a clean API for long-running operations with progress updates.
 */

import { YomikiriError } from "@/features/error";
import { DeferredWithProgress } from "../utils";

type ConnectionHandler = (port: chrome.runtime.Port) => void;

type StreamMessage<S, P> = StreamProgressMessage<P> | StreamSuccessMessage<S> | StreamErrorMessage;

interface StreamProgressMessage<P> {
  status: "progress";
  message: P;
}

interface StreamSuccessMessage<S> {
  status: "success";
  message: S;
}

interface StreamErrorMessage {
  status: "error";
  message: YomikiriError;
}

export type ExtensionStream<Key extends string, Success, Progress> = {
  key: Key;
  success: Success;
  progress: Progress;
};

type AnyExtensionStream = ExtensionStream<string, unknown, unknown>;

export type StreamByKey<S extends AnyExtensionStream, K extends S["key"]> = Extract<S, { key: K }>;

export class ExtensionStreamListener<S extends AnyExtensionStream> {
  private constructor() {}

  static init<S extends AnyExtensionStream>(): ExtensionStreamListener<S> {
    return new ExtensionStreamListener();
  }

  /**
   * Handle incoming connections for this key.
   * The handler should return a PromiseWithProgress that will be used to stream
   * progress updates and the final result back to the requester.
   */
  on<K extends S["key"]>(
    key: K,
    handler: () => DeferredWithProgress<
      StreamByKey<S, K>["success"],
      StreamByKey<S, K>["progress"]
    >,
  ): this {
    handleConnection(key, (port) => {
      const progressPromise = handler();

      progressPromise.progress.subscribe((progress) => {
        const message: StreamProgressMessage<StreamByKey<S, K>["progress"]> = {
          status: "progress",
          message: progress,
        };
        port.postMessage(message);
      });

      progressPromise
        .then((result) => {
          const message: StreamSuccessMessage<StreamByKey<S, K>["success"]> = {
            status: "success",
            message: result,
          };
          port.postMessage(message);
        })
        .catch((error: unknown) => {
          const message: StreamErrorMessage = {
            status: "error",
            message: YomikiriError.from(error),
          };
          port.postMessage(message);
        });
    });
    return this;
  }

  done(): [S] extends [never] ? this : never;
  done(): this {
    return this;
  }

  verify(): void {}
}

/**
 * Send a connection request and return a PromiseWithProgress.
 * The progress will be streamed from the handler, and the promise will resolve with the final result.
 */
export function startExtensionStream<S extends AnyExtensionStream>(
  key: S["key"],
  initialProgress: S["progress"],
): DeferredWithProgress<S["success"], S["progress"]> {
  const port = chrome.runtime.connect({ name: key });
  const prom = DeferredWithProgress.withProgress<S["success"], S["progress"]>(initialProgress);

  let completed = false;

  port.onMessage.addListener(async (msg: StreamMessage<S["success"], S["progress"]>) => {
    if (msg.status === "progress") {
      await prom.setProgress(msg.message);
    } else if (msg.status === "success") {
      completed = true;
      prom.resolve(msg.message);
    } else {
      completed = true;
      prom.reject(YomikiriError.from(msg.message));
    }
  });

  port.onDisconnect.addListener(() => {
    if (!completed) {
      completed = true;
      prom.reject(
        new YomikiriError(
          "Unexpectedly disconnected from background script",
        ),
      );
    }
  });

  return prom;
}

function handleConnection(
  name: string,
  handler: ConnectionHandler,
) {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== name) return;
    handler(port);
  });
}
