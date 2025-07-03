import { migrateConfigObject, type StoredCompatConfiguration } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import {
  extensionManifest,
  getStorage,
  handleStorageChange,
  japaneseTtsVoices,
  NonContentScriptFunction,
  setStorage,
  speakJapanese,
} from "@/features/extension/browserApi";
import { LazyAsync } from "@/features/utils";
import { getTranslation } from "../shared/translate";
import type { IPlatform, TTSVoice, VersionInfo } from "../types";

export class DesktopPlatform implements IPlatform {
  readonly type = "desktop";

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
    "tts",
    async ({ text, voice }) => {
      await speakJapanese(text, voice);
    },
  );

  readonly translate = NonContentScriptFunction("translate", getTranslation);

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  readonly migrateConfig = NonContentScriptFunction(
    "migrateConfig",
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
}
