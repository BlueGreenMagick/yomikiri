import type { AnyPlatform } from "@/platform/types";
import type { StoredConfig } from "./config";

export interface StoreValues {
  "web.config.v3": StoredConfig;
}

type PartialStoreValues<Keys extends keyof StoreValues> = {
  [key in Keys]: StoreValues[key] | null;
};

type StoreValuesUnion = {
  [K in keyof StoreValues]: [K, StoreValues[K]];
}[keyof StoreValues];

export class Store {
  constructor(public readonly platform: AnyPlatform) {}

  async get<K extends keyof StoreValues>(key: K): Promise<StoreValues[K]> {
    return await this.platform.getStore(key) as StoreValues[K];
  }

  async set(
    ...args: StoreValuesUnion
  ): Promise<void> {
    const [key, value] = args;
    await this.platform.setStore(key, value);
  }

  async getBatch<K extends keyof StoreValues>(keys: K[]): Promise<PartialStoreValues<K>> {
    return await this.platform.getStoreBatch(keys) as PartialStoreValues<K>;
  }

  async setBatch<K extends keyof StoreValues>(valuesMap: PartialStoreValues<K>): Promise<void> {
    await this.platform.setStoreBatch(valuesMap);
  }
}
