import { migrateConfigObject, type StoredCompatConfiguration } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import { getStorage, setStorage } from "@/features/extension";
import { LazyAsync } from "@/features/utils";
import { getTranslation } from "@/platform/shared/translate";
import type { JSONStoreValues, TranslateResult } from "@/platform/types";
import type { IosMessagingPage } from "./messaging";

export class IosPlatformPage {
  // config migration is done only once even if requested multiple times
  private readonly configMigration = new LazyAsync<StoredConfiguration>(
    async () => {
      return await this.migrateConfigInner();
    },
  );

  constructor(readonly messaging: IosMessagingPage) {}

  /**
   * If value is `null` or `undefined`, deletes the store.
   */
  async setStore(key: string, value: unknown): Promise<void> {
    const jsonMap = {
      [key]: (value === null || value === undefined) ? null : JSON.stringify(value),
    };
    await this._setStoreBatch(jsonMap);
  }

  /**
   * If value is `null` or `undefined`, deletes the store.
   */
  async setStoreBatch(map: Record<string, unknown>) {
    const jsonMap: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(map)) {
      jsonMap[key] = value === null || value === undefined ? null : JSON.stringify(value);
    }

    await this._setStoreBatch(jsonMap);
  }

  async _setStoreBatch(jsonMap: JSONStoreValues): Promise<void> {
    await this.messaging.send("setStoreBatch", jsonMap);
  }

  async getStore<T>(key: string): Promise<T | null> {
    const result = await this.getStoreBatch([key]);
    const value = result[key];
    if (value === null) return value;
    return JSON.parse(value) as T;
  }

  async getStoreBatch(keys: string[]): Promise<JSONStoreValues> {
    const result = await this.messaging.send("getStoreBatch", keys);

    return Object.fromEntries(
      Object.entries(result).map((
        [key, value],
      ) => [key, value === null ? null : JSON.parse(value)]),
    );
  }

  migrateConfig(): Promise<StoredConfiguration> {
    return this.configMigration.get();
  }

  private async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    await this.saveConfig(migrated);
    return migrated;
  }

  async getConfig() {
    return this.updateConfig();
  }

  async saveConfig(config: StoredConfiguration) {
    await this.setStore("web_config", config);
    await setStorage("config", config);
  }

  // App config is the source of truth
  async updateConfig(): Promise<StoredCompatConfiguration> {
    const webConfigP = getStorage("config", {});

    const appConfigP: Promise<StoredCompatConfiguration> = this.getStore<
      StoredCompatConfiguration
    >("web_config").then((value) => value ?? {});
    const [webConfig, appConfig] = await Promise.all([webConfigP, appConfigP]);
    if (webConfig != appConfig) {
      await setStorage("config", appConfig);
    }
    return appConfig;
  }

  translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }
}
