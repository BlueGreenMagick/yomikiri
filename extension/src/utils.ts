namespace Utils {
  export type First<T extends any[]> = T extends [infer FIRST, ...any[]]
    ? FIRST
    : never;
  export type Second<T extends any[]> = T extends [any, infer SECOND, ...any[]]
    ? SECOND
    : never;
  export type PromiseResolver<K> = (value: K | PromiseLike<K>) => void;
  export type PromiseRejector = (reason?: any) => void;

  export function createPromise<V>(): [
    Promise<V>,
    PromiseResolver<V>,
    (reason?: any) => void
  ] {
    let resolve: PromiseResolver<V>, reject: (reason?: any) => void;
    const promise = new Promise<V>((rs: PromiseResolver<V>, rj) => {
      resolve = rs;
      reject = rj;
    });
    // @ts-ignore
    return [promise, resolve, reject];
  }

  export function listIsIdentical(l1: any[], l2: any[]) {
    if (l1.length != l2.length) return false;
    for (let i = 0; i < l1.length; i++) {
      if (l1[i] !== l2[i]) return false;
    }
    return true;
  }

  export function rectContainsPoint(
    rect: DOMRect,
    x: number,
    y: number
  ): boolean {
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

  // https://stackoverflow.com/a/25612313/15537371
  /**
   * Replaces '&' and '<' for use inside HTML tag.
   * Not suitable for HTML attributes
   */
  export function escapeHTML(input: string): string {
    return input.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  /** "http://url?" + Utils.urlParams({key: value}) */
  export function urlParams(params: { [key: string]: string }): string {
    return Object.entries(params)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      )
      .join("&");
  }

  interface QueueItem<I extends any[], R> {
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
  export function SingleQueued<I extends any[], R>(
    fn: (...inp: I) => Promise<R>
  ): (...inp: I) => Promise<R | null> {
    let queue: QueueItem<I, R | null> | null = null;
    let running = false;

    // pop from queue and run
    const run = async () => {
      if (queue === null) {
        return;
      }
      let inp = queue.inp;
      let resolve = queue.resolve;
      let reject = queue.reject;
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
  let _benchLogs: string[] = [];

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
}

export default Utils;
