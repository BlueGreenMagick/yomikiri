import { YomikiriError } from "@/features/error";
import { EXTENSION_CONTEXT } from "consts";
import { PromiseWithProgress } from "../utils";

type ConnectionHandler = (port: chrome.runtime.Port) => void;

function handleConnection(
  name: string,
  handler: ConnectionHandler,
) {
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== name) return;
    handler(port);
  });
}

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

/**
 * Abstraction for Chrome extension port-based connections that support streaming responses.
 * Provides a clean API for long-running operations with progress updates.
 *
 * `key` must be unique across API in `@/features/extension/stream.ts`
 */
export class ExtensionStream<TResult, TProgress> {
  constructor(public readonly key: string) {}

  /**
   * Handle incoming connections for this key.
   * The handler should return a PromiseWithProgress that will be used to stream
   * progress updates and the final result back to the requester.
   */
  handle(handler: () => PromiseWithProgress<TResult, TProgress>) {
    handleConnection(this.key, (port) => {
      const progressPromise = handler();

      progressPromise.progress.subscribe((progress) => {
        const message: StreamProgressMessage<TProgress> = {
          status: "progress",
          message: progress,
        };
        port.postMessage(message);
      });

      progressPromise
        .then((result) => {
          const message: StreamSuccessMessage<TResult> = {
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
  }

  /**
   * Send a connection request and return a PromiseWithProgress.
   * The progress will be streamed from the handler, and the promise will resolve with the final result.
   */
  start(initialProgress: TProgress): PromiseWithProgress<TResult, TProgress> {
    const port = chrome.runtime.connect({ name: this.key });
    const prom = new PromiseWithProgress<TResult, TProgress>(initialProgress);

    let completed = false;

    port.onMessage.addListener(async (msg: StreamMessage<TResult, TProgress>) => {
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
}

/**
 * Returns a function that:
 * - If in background context: runs `fn`
 * - Else: Sends a stream connection to background to run `fn`.
 *
 * If in background, it attaches a stream handler that executes `fn`.
 *
 * `key` must be unique across API in `@/features/extension/stream.ts`
 */
export function BackgroundStreamFunction<TResult, TProgress>(
  key: string,
  fn: () => PromiseWithProgress<TResult, TProgress>,
  initialProgress: TProgress,
): () => PromiseWithProgress<TResult, TProgress> {
  const stream = new ExtensionStream<TResult, TProgress>(key);

  if (EXTENSION_CONTEXT === "background") {
    stream.handle(fn);
  }

  return function inner(): PromiseWithProgress<TResult, TProgress> {
    if (EXTENSION_CONTEXT !== "background") {
      return stream.start(initialProgress);
    } else {
      return fn();
    }
  };
}

/**
 * Returns a function that:
 * - If in content script: sends a stream connection to background to run `fn`
 * - Else: runs `fn` as-is.
 *
 * If in background, it attaches a stream handler that executes `fn`.
 *
 * `key` must be unique across API in `@/features/extension/stream.ts`
 */
export function NonContentScriptStreamFunction<TResult, TProgress>(
  key: string,
  fn: () => PromiseWithProgress<TResult, TProgress>,
  initialProgress: TProgress,
): () => PromiseWithProgress<TResult, TProgress> {
  const stream = new ExtensionStream<TResult, TProgress>(key);

  if (EXTENSION_CONTEXT === "background") {
    stream.handle(fn);
  }

  return function inner(): PromiseWithProgress<TResult, TProgress> {
    if (EXTENSION_CONTEXT === "contentScript") {
      return stream.start(initialProgress);
    } else {
      return fn();
    }
  };
}
