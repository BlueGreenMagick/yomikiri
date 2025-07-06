import { migrateConfigObject, type StoredCompatConfiguration } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import {
  BackgroundFunction,
  extensionManifest,
  getStorage,
  handleStorageChange,
  japaneseTtsVoices,
  NonContentScriptFunction,
  setStorage,
  speakJapanese,
} from "@/features/extension";
import { LazyAsync } from "@/features/utils";
import { getTranslation } from "../shared/translate";
import type { IPlatform, TTSRequest, TTSVoice, VersionInfo } from "../types";
import type { Database } from "./db";

export class DesktopPlatform implements IPlatform {
  readonly type = "desktop";

  private constructor(
    private background: DesktopPlatformBackground | null,
  ) {}

  static foreground(): DesktopPlatform {
    return new DesktopPlatform(null);
  }

  static background(background: DesktopPlatformBackground): DesktopPlatform {
    return new DesktopPlatform(background);
  }

  // config migration is done only once even if requested multiple times
  private readonly configMigration = new LazyAsync<StoredConfiguration>(
    async () => {
      return await this.migrateConfigInner();
    },
  );

  async getConfig(): Promise<StoredCompatConfiguration> {
    return await getStorage("config", {});
  }

  /** subscriber is called when config is changed. */
  subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfiguration);
    });
  }

  saveConfig(config: StoredConfiguration): Promise<void> {
    console.debug("config saved");
    return setStorage("config", config);
  }

  openOptionsPage(): Promise<void> {
    return chrome.runtime.openOptionsPage();
  }

  versionInfo(): VersionInfo {
    const manifest = extensionManifest();
    return {
      version: manifest.version,
    };
  }

  /** This function is and only should be called in options page */
  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    return japaneseTtsVoices();
  }

  readonly playTTS = NonContentScriptFunction(
    "DesktopPlatform.playTTS",
    async ({ text, voice }: TTSRequest) => {
      await speakJapanese(text, voice);
    },
  );

  readonly translate = NonContentScriptFunction("DesktopPlatform.translate", getTranslation);

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  readonly migrateConfig = NonContentScriptFunction(
    "DesktopPlatform.migrateConfig",
    async () => {
      return await this.configMigration.get();
    },
  );

  async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    await this.saveConfig(migrated);
    return migrated;
  }

  readonly setStorageBatch = BackgroundFunction(
    "DesktopPlatform.setStorageBatch",
    async (req: Record<string, unknown>): Promise<void> => {
      return this.background!.db.get().then((db) => db.storage.setStorageBatch(req));
    },
  );

  readonly getStorageBatch = BackgroundFunction(
    "DesktopPlatform.getStorageBatch",
    async (keys: string[]): Promise<Record<string, unknown>> => {
      return this.background!.db.get().then((db) => db.storage.getStorageBatch(keys));
    },
  );

  readonly setStorage = BackgroundFunction(
    "DesktopPlatform.setStorage",
    async (key: string, value: unknown) => {
      return this.background!.db.get().then((db) => db.storage.setStorage(key, value));
    },
  );

  readonly getStorage = BackgroundFunction(
    "DesktopPlatform.getStorage",
    async (key: string) => {
      return this.background!.db.get().then((db) => db.storage.getStorage(key));
    },
  );
}

export class DesktopPlatformBackground {
  constructor(public db: LazyAsync<Database>) {}
}
