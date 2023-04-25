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
}

export default Utils;
