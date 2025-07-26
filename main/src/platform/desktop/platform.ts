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
import type { DesktopPlatformBackground } from "./background/platform";

/** Must be initialized synchronously on page load */
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

  readonly setStoreBatch = BackgroundFunction(
    "DesktopPlatform.setStoreBatch",
    async (req: Record<string, unknown>): Promise<void> => {
      return this.background!.db.get().then((db) => db.store.setStoreBatch(req));
    },
  );

  readonly getStoreBatch = BackgroundFunction(
    "DesktopPlatform.getStoreBatch",
    async (keys: string[]): Promise<Record<string, unknown>> => {
      return this.background!.db.get().then((db) => db.store.getStoreBatch(keys));
    },
  );

  readonly setStore = BackgroundFunction(
    "DesktopPlatform.setStore",
    async (key: string, value: unknown) => {
      return this.background!.db.get().then((db) => db.store.setStore(key, value));
    },
  );

  readonly getStore = BackgroundFunction(
    "DesktopPlatform.getStore",
    async (key: string) => {
      return this.background!.db.get().then((db) => db.store.getStore(key));
    },
  );
}
