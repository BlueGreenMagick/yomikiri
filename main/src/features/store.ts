import type { AnyPlatform } from "@/platform/types";
import type { Configuration } from "./config";

export interface StorageValues {
  "web.config.v4": Configuration;
}

type PartialStorageValues<Keys extends keyof StorageValues> = {
  [key in Keys]: StorageValues[key] | null;
};

type StorageValuesUnion = {
  [K in keyof StorageValues]: [K, StorageValues[K]];
}[keyof StorageValues];

export class Store {
  constructor(public readonly platform: AnyPlatform) {}

  async get<K extends keyof StorageValues>(key: K): Promise<StorageValues[K]> {
    return await this.platform.getStorage(key) as StorageValues[K];
  }

  async set(
    ...args: StorageValuesUnion
  ): Promise<void> {
    const [key, value] = args;
    await this.platform.setStorage(key, value);
  }

  async getBatch<K extends keyof StorageValues>(keys: K[]): Promise<PartialStorageValues<K>> {
    return await this.platform.getStorageBatch(keys) as PartialStorageValues<K>;
  }

  async setBatch<K extends keyof StorageValues>(valuesMap: PartialStorageValues<K>): Promise<void> {
    await this.platform.setStorageBatch(valuesMap);
  }
}
