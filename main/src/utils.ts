import { writable, type Writable } from "svelte/store";

export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Thennable {
  then: () => void
}

// Limit the value `T` can take so below situation is avoided.
//
// const a : Promise<{}> | {} = Promise.resolve(5)
export type PromiseOrValue<T> = Promise<unknown> extends T ? never : Promise<T> | Exclude<T, Thennable>

export type First<T extends unknown[]> = T extends [infer FIRST, ...unknown[]]
  ? FIRST
  : never;
export type Second<T extends unknown[]> = T extends [unknown, infer SECOND, ...unknown[]]
  ? SECOND
  : never;
export type PromiseResolver<K> = (value: K | PromiseLike<K>) => void;
export type PromiseRejector = (reason?: unknown) => void;

/* eslint-disable-next-line -- {} is any object except undefined or null */
export type NonUndefined = {} | null


export const isTouchScreen: boolean = navigator.maxTouchPoints > 0;


export function createPromise<V>(): [
  Promise<V>,
  PromiseResolver<V>,
  (reason?: unknown) => void
] {
  let resolve: PromiseResolver<V>, reject: (reason?: unknown) => void;
  const promise = new Promise<V>((rs: PromiseResolver<V>, rj) => {
    resolve = rs;
    reject = rj;
  });
  // @ts-expect-error
  return [promise, resolve, reject];
}

export class PromiseWithProgress<V, P> extends Promise<V> {
  progress: Writable<P>;

  constructor(
    executor: (resolve: PromiseResolver<V>, reject: PromiseRejector) => void,
    initialProgress?: P
  ) {
    super(executor);

    if (initialProgress != undefined) {
      this.progress = writable(initialProgress);
    } else {
      this.progress = writable();
    }
  }

  static fromPromise<V, P>(
    promise: Promise<V>,
    initialProgress?: P
  ): PromiseWithProgress<V, P> {
    return new PromiseWithProgress((res, rej) => {
      promise.then(res, rej);
    }, initialProgress);
  }

  setProgress(progress: P) {
    this.progress.set(progress);
  }
}

export class Lazy<T extends NonUndefined> {
  initializer: () => T
  inner?: T = undefined

  constructor(initializer: () => T) {
    this.initializer = initializer
  }

  get(): T {
    if (this.inner === undefined) {
      this.inner = this.initializer()
    }
    return this.inner
  }
}

export class LazyAsync<T extends NonUndefined> {
  private initializer: () => PromiseOrValue<T>
  private inner?: PromiseOrValue<T> = undefined
  private innerValue?: T = undefined
  initialized = false

  constructor(initializer: () => PromiseOrValue<T>) {
    this.initializer = initializer
  }

  async get(): Promise<T> {
    if (this.inner === undefined) {
      this.inner = this.initializer()
      this.innerValue = await this.inner
      this.initialized = true
      return this.innerValue
    }
    return await this.inner
  }

  getIfInitialized(): T | undefined {
    if (this.innerValue !== undefined) {
      return this.innerValue
    }
    return
  }
}

export function listIsIdentical(l1: unknown[], l2: unknown[]) {
  if (l1.length != l2.length) return false;
  for (let i = 0; i < l1.length; i++) {
    if (l1[i] !== l2[i]) return false;
  }
  return true;
}

export function rectContainsPoint(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  );
}

export function containsPoint(
  obj: { getClientRects: () => DOMRectList },
  x: number,
  y: number
): boolean {
  const rects = obj.getClientRects();
  for (const rect of rects) {
    if (rectContainsPoint(rect, x, y)) {
      return true;
    }
  }
  return false;
}

/** Converts index of UTF-16 code units to index of unicode code points*/
export function toCodePointIndex(text: string, codeUnitIdx: number): number {
  if (codeUnitIdx < 0) {
    throw new Error("codeUnitIdx may not be smaller than 0.");
  }
  if (codeUnitIdx > text.length) {
    throw new Error("codeUnitIdx may not be greater than text.length.");
  }

  let codePointIdx = 0;
  // string iteration is done in unicode code points
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/@@iterator
  for (const codePoint of text) {
    codeUnitIdx -= codePoint.length;
    if (codeUnitIdx < 0) {
      return codePointIdx;
    }
    codePointIdx += 1;
  }
  return codePointIdx;
}

// https://stackoverflow.com/a/25612313/15537371
/**
 * Replaces '&' and '<' for use inside HTML tag.
 * Not suitable for HTML attributes
 */
export function escapeHTML(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export function escapeRegex(text: string): string {
  return text
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    .replace(/-/g, '\\x2d');
}

/** "http://url?" + generateUrlParams({key: value}) */
export function generateUrlParams(params: Record<string, string>): string {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
}

export function errorMessage(
  err: unknown,
  other = "Unknown error: check the browser console for details"
): string {
  if (err instanceof Error) {
    return err.message;
  } else {
    console.error(err);
    return other;
  }
}

interface QueueItem<I extends unknown[], R> {
  inp: I;
  resolve: PromiseResolver<R>;
  reject: PromiseRejector;
}

/**
 * Returns an async function that is executed consequently.
 * Execution starts when previous call of this function finishes.
 *
 * If there is an existing queue, it is replaced with new input and previous queued call returns with `null`.
 */
export function SingleQueued<I extends unknown[], R>(
  fn: (...inp: I) => Promise<R>
): (...inp: I) => Promise<R | null> {
  let queue: QueueItem<I, R | null> | null = null;
  let running = false;

  // pop from queue and run
  const run = async () => {
    if (queue === null) {
      return;
    }
    const inp = queue.inp;
    const resolve = queue.resolve;
    const reject = queue.reject;
    running = true;
    queue = null;
    try {
      const result = await fn(...inp);
      running = false;
      resolve(result);
    } catch (e) {
      running = false;
      reject(e);
    }
    run();
  };

  return (...inp: I) => {
    if (queue !== null) {
      queue.resolve(null);
    }
    const [promise, resolve, reject] = createPromise<R | null>();
    queue = {
      inp,
      resolve,
      reject,
    };
    if (!running) {
      run();
    }
    return promise;
  };
}

let lastBench: number = performance.now();
const _benchLogs: string[] = [];

export function benchStart() {
  lastBench = performance.now();
  return lastBench;
}

export function bench(msg: string): number {
  const curr = performance.now();
  const diff = curr - lastBench;
  lastBench = curr;
  _benchLogs.push(`${msg} ${diff} ${Date.now()}`);
  console.log(msg, diff, Date.now());
  return diff;
}

/** View logs from before console is opened */
export function benchLogs(): string[] {
  return _benchLogs;
}

export function awaitTime(ms: number): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  setTimeout(resolve, ms);
  return promise;
}

const _logs: unknown[] = [];

export function log(...args: unknown[]): void {
  _logs.push(args)
}

export function logs(): string[] {
  return _logs;
}

export async function nextDocumentPaint(): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  // macro tasks are run after paint action
  requestAnimationFrame(() => { setTimeout(resolve) })
  return promise
}

export * as default from "./utils"