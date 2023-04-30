/** 

import { writable, type Writable } from "svelte/store";
import Api from ".";

async function storageWritable<T>(key: string): Promise<Writable<T>> {
  let initial = (await Api.getStorage(key)) as T;
  let store = writable(initial);

  Api.handleStorageChange(key, (change) => {
    store.set(change.newValue as T);
  });

  async function setValue(value: T) {
    await Api.setStorage(key, value);
  }

  return {
    set: setValue,
    update: store.update,
    subscribe: store.subscribe,
  };
}

*/
