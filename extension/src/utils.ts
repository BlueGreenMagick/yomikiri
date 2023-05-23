namespace Utils {
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

  export type PromiseResolver<K> = (value: K | PromiseLike<K>) => void;
  export type PromiseRejector = (reason?: any) => void;

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

  export function rangeContainsPoint(
    range: Range,
    x: number,
    y: number
  ): boolean {
    const rects = range.getClientRects();
    for (const rect of rects) {
      if (rectContainsPoint(rect, x, y)) {
        return true;
      }
    }
    return false;
  }

  export function escapeHTML(input: string): string {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let lastBench: number = performance.now();

  export function benchStart() {
    lastBench = performance.now();
    return lastBench;
  }

  export function bench(msg: string): number {
    const curr = performance.now();
    const diff = curr - lastBench;
    lastBench = curr;
    console.log(msg, diff, Date.now());
    return diff;
  }
}

export default Utils;
