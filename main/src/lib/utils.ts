import { writable, type Writable } from "svelte/store";
import { YomikiriError } from "./error";

export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Thennable {
  then: () => void;
}

export type Satisfies<T extends U, U> = T;

/**
 * Limit the value `T` can take so below situation is avoided.
 *
 * const a : Promise<{}> | {} = Promise.resolve(5)
 */
export type PromiseOrValue<T> =
  Promise<unknown> extends T ? never : Promise<T> | Exclude<T, Thennable>;

export type First<T extends unknown[]> =
  T extends [infer FIRST, ...unknown[]] ? FIRST : never;
export type Second<T extends unknown[]> =
  T extends [unknown, infer SECOND, ...unknown[]] ? SECOND : never;
export type PromiseResolver<K> = (value: K | PromiseLike<K>) => void;
export type PromiseRejector = (reason?: unknown) => void;

/* eslint-disable-next-line -- {} is any object except undefined or null */
export type NonUndefined = {} | null;

export const isTouchScreen: boolean = navigator.maxTouchPoints > 0;

export function createPromise<V>(): [
  Promise<V>,
  PromiseResolver<V>,
  (reason?: unknown) => void,
] {
  let resolve: PromiseResolver<V>, reject: (reason?: unknown) => void;
  const promise = new Promise<V>((rs: PromiseResolver<V>, rj) => {
    resolve = rs;
    reject = rj;
  });
  // @ts-expect-error promise executor is run synchronously
  return [promise, resolve, reject];
}

export class PromiseWithProgress<V, P> extends Promise<V> {
  progress: Writable<P>;

  constructor(
    executor: (resolve: PromiseResolver<V>, reject: PromiseRejector) => void,
    initialProgress?: P,
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
    initialProgress?: P,
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
  private initializer: () => T;
  private inner?: T = undefined;
  private initializeHandler: (obj: T) => void = () => {};

  constructor(initializer: () => T) {
    this.initializer = initializer;
  }

  get(): T {
    if (this.inner === undefined) {
      this.inner = this.initializer();
      this.initializeHandler(this.inner);
    }
    return this.inner;
  }

  getIfInitialized(): T | undefined {
    return this.inner;
  }

  get initialized() {
    return this.inner !== undefined;
  }

  /** Runs immediately if already initialized */
  onInitialize(handler: (obj: T) => void) {
    if (this.inner !== undefined) {
      handler(this.inner);
    } else {
      this.initializeHandler = handler;
    }
  }
}

export class LazyAsync<T extends NonUndefined> {
  private initializer: () => PromiseOrValue<T>;
  private inner?: PromiseOrValue<T> = undefined;
  private innerValue?: T = undefined;
  private initializeHandler: (obj: T) => void = () => {};

  constructor(initializer: () => PromiseOrValue<T>) {
    this.initializer = initializer;
  }

  async get(): Promise<T> {
    if (this.inner === undefined) {
      this.inner = this.initializer();
      this.innerValue = await this.inner;
      this.initializeHandler(this.innerValue);
      return this.innerValue;
    }
    return await this.inner;
  }

  getIfInitialized(): T | undefined {
    if (this.innerValue !== undefined) {
      return this.innerValue;
    }
    return;
  }

  get initialized() {
    return this.innerValue !== undefined;
  }

  /** Runs immediately if already initialized */
  onInitialize(handler: (obj: T) => void) {
    if (this.innerValue !== undefined) {
      handler(this.innerValue);
    } else {
      this.initializeHandler = handler;
    }
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
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function containsPoint(
  obj: { getClientRects: () => DOMRectList },
  x: number,
  y: number,
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
    throw new YomikiriError("codeUnitIdx may not be smaller than 0.");
  }
  if (codeUnitIdx > text.length) {
    throw new YomikiriError("codeUnitIdx may not be greater than text.length.");
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
 * Replaces '&', '<', and '>' for use inside HTML tag.
 * Not suitable for HTML attributes, which also needs quotes escaped.
 */
export function escapeHTML(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// From rust regex::escape()
// https://github.com/rust-lang/regex/blob/1a069b9232c607b34c4937122361aa075ef573fa/regex-syntax/src/lib.rs#L260
export function escapeRegex(text: string): string {
  return text.replace(/[\\.+*?()|[\]{}^$#&\-~]/g, "\\$&");
}

/** "http://url?" + generateUrlParams({key: value}) */
export function generateUrlParams(params: Record<string, string>): string {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
}

export function getErrorMessage(
  err: unknown,
  other = "Unknown error: check the browser console for details",
): string {
  if (!!err && typeof (err as { message: string }).message === "string") {
    return (err as { message: string }).message;
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
 * If there is an existing queue, it is replaced with new input and previous queued call is resolved with `null`.
 * In such case, the second call resolves earlier than the first call.
 */
export function SingleQueued<I extends unknown[], R>(
  fn: (...inp: I) => Promise<R>,
): (...inp: I) => Promise<R | null> {
  let queue: QueueItem<I, R | null> | null = null;
  let running = false;

  // pop from queue and run
  const run = () => {
    if (queue === null) {
      return;
    }
    const inp = queue.inp;
    const resolve = queue.resolve;
    const reject = queue.reject;
    running = true;
    queue = null;
    fn(...inp)
      .then((result) => {
        running = false;
        resolve(result);
        run();
      })
      .catch((e: unknown) => {
        running = false;
        reject(e);
      });
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
  _logs.push(args);
}

export function logs(): unknown[] {
  return _logs;
}

/** Cannot be called in background */
export async function nextDocumentPaint(): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  // macro tasks are run after paint action
  requestAnimationFrame(() => {
    setTimeout(resolve);
  });
  return promise;
}

export async function nextTask(): Promise<void> {
  const [promise, resolve] = createPromise<void>();
  setTimeout(resolve, 0);
  return promise;
}

/**
 * expose objects to global context.
 *
 * When a function `() => any` is provided, it is used as a getter for the property.
 */
export function exposeGlobals(
  objects: Record<string, object | (() => unknown)>,
) {
  for (const prop in objects) {
    const obj = objects[prop];

    // browser.runtime.reload() on ios cause unwritable property to be redefined
    try {
      if (obj instanceof LazyAsync) {
        Object.defineProperty(self, prop, {
          get() {
            void obj.get();
            return obj.getIfInitialized(); // eslint-disable-line
          },
        });
      } else if (typeof obj === "function") {
        Object.defineProperty(self, prop, {
          get() {
            return obj(); // eslint-disable-line
          },
        });
      } else {
        Object.defineProperty(self, prop, {
          value: obj,
          writable: true,
        });
      }
    } catch {
      // pass
    }
  }
}

// response format for extension and ios messaging
export interface SuccessfulResponseMessage<R> {
  success: true;
  resp: R;
}

export interface FailedResponseMessage {
  success: false;
  error: unknown; // yomikiri-error like struct
}

export type ResponseMessage<R> =
  | SuccessfulResponseMessage<R>
  | FailedResponseMessage;

export function handleResponseMessage<R>(resp: ResponseMessage<R>): R {
  if (resp.success) {
    return resp.resp;
  } else {
    let obj: unknown;
    if (typeof resp.error === "string") {
      obj = JSON.parse(resp.error);
    } else {
      obj = resp.error;
    }
    const error = YomikiriError.from(obj);
    throw error;
  }
}

export function hasOwnProperty<O extends object, K extends string>(
  obj: O,
  key: K,
): key is keyof O & K {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function keyInObject<O extends object, K extends string>(
  obj: O,
  key: K,
): key is keyof O & K {
  return key in obj;
}

export function isAppleDevice(): boolean {
  return navigator.userAgent.includes("Mac");
}

/**
 * `node instanceof Text` may not work in iframes
 * as `Text` function is separately defined for each window
 */
export function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

/**
 * `node instanceof Element` may not work in iframes
 * as `Element` function is separately defined for each window
 */
export function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

/**
 * Creates a function that takes in a single argument,
 * returns a tick that tracks if passed argument has changed with `Object.is()`.
 *
 * ### Usage in Svelte
 *
 * ```svelte
 * const stateChangeTracker = newChangeTracker();
 * $: stateChanged = stateChangeTracker(state)
 * ```
 */
export function newChangeTracker<T>(): (obj: T) => number {
  let prev: T | undefined;
  let tick = 0;

  return (obj: T) => {
    if (!Object.is(obj, prev)) {
      prev = obj;
      tick += 1;
    }
    return tick;
  };
}

export class Disposable {
  private disposeFn: () => void;

  constructor(disposeFn: () => void) {
    this.disposeFn = disposeFn;
  }

  dispose(): void {
    this.disposeFn();
  }
}

export class Hook<I extends Array<unknown> = [], O = void> {
  private fns: ((...args: I) => O)[] = [];

  listen(fn: (...args: I) => O): Disposable {
    this.fns.push(fn);
    return new Disposable(() => {
      const idx = this.fns.indexOf(fn);
      this.fns.splice(idx, 1);
    });
  }

  call(...args: I): O[] {
    const results: O[] = [];
    for (const fn of this.fns) {
      results.push(fn(...args));
    }
    return results;
  }
}

export class AsyncHook<I extends Array<unknown> = [], O = void> {
  private fns: ((...args: I) => Promise<O>)[] = [];

  listen(fn: (...args: I) => Promise<O>): Disposable {
    this.fns.push(fn);
    return new Disposable(() => {
      const idx = this.fns.indexOf(fn);
      this.fns.splice(idx, 1);
    });
  }

  async call(...args: I): Promise<O[]> {
    const promises = [];
    for (const fn of this.fns) {
      const p = fn(...args);
      promises.push(p);
    }
    return Promise.all(promises);
  }
}

/**
 * Returns datestring in yyyy-mm-dd format.
 *
 * Unlike `date.toISOString()` which outputs date in UTC, this outputs date in local timezone.
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  // month is 0-based
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a version string in the format of n.n.n.n (with 1 ~ 4 parts).
 * Unspecified part is set as 0
 */
export class Version {
  major: number;
  minor: number;
  patch: number;
  dev: number;

  constructor(versionString: string) {
    const [major, minor, patch, dev] = versionString.split(".");
    this.major = major !== undefined ? parseInt(major) : 0;
    this.minor = minor !== undefined ? parseInt(minor) : 0;
    this.patch = patch !== undefined ? parseInt(patch) : 0;
    this.dev = dev !== undefined ? parseInt(dev) : 0;
  }
}

export * as default from "./utils";
