import { migrateConfigObject, type StoredConfigurationV1 } from "@/features/compat";
import type { StoredConfig } from "@/features/config";
import { getStorage, setStorage } from "@/features/extension";
import { LazyAsync } from "@/features/utils";
import { getTranslation } from "@/platform/shared/translate";
import type { TranslateResult } from "@/platform/types";
import type { IosMessaging } from "../messaging";

export class IosPlatformPage {
  // config migration is done only once even if requested multiple times
  private readonly configMigration = new LazyAsync<StoredConfig>(
    async () => {
      return await this.migrateConfigInner();
    },
  );

  constructor(readonly messaging: IosMessaging) {}

  async getStoreBatch(keys: string[]): Promise<Record<string, unknown>> {
    const result = await this.messaging.send("getStoreBatch", keys);

    return Object.fromEntries(
      Object.entries(result).map((
        [key, value],
      ) => [key, value === null ? null : JSON.parse(value)]),
    );
  }

  migrateConfig(): Promise<StoredConfig> {
    return this.configMigration.get();
  }

  private async migrateConfigInner(): Promise<StoredConfig> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    await this.saveConfig(migrated);
    return migrated;
  }

  async getConfig(): Promise<StoredConfigurationV1> {
    return this.updateConfig();
  }

  async saveConfig(config: StoredConfig) {
    await this.messaging.invokeApp({ type: "SetConfig", args: JSON.stringify(config) });
    await setStorage("config", config);
  }

  // App config is the source of truth
  async updateConfig(): Promise<StoredConfigurationV1> {
    const webConfigP = getStorage("config", {});

    const appConfigP: Promise<StoredConfigurationV1> = this.messaging.invokeApp({
      type: "GetConfig",
      args: null,
    }).then((
      value,
    ) => value ?? {});
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
