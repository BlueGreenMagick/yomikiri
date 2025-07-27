import type { StoredCompatConfiguration } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import {
  BackgroundFunction,
  extensionManifest,
  getStorage,
  handleStorageChange,
  japaneseTtsVoices,
  NonContentScriptFunction,
  setStorage,
} from "@/features/extension";
import type { IPlatform, TTSRequest, TTSVoice, VersionInfo } from "../types";
import type { DesktopPlatformBackground } from "./background/platform";
import type { DesktopPlatformPage } from "./page/platform";

/** Must be initialized synchronously on page load */
export class DesktopPlatform implements IPlatform {
  readonly type = "desktop";

  private constructor(
    private page: DesktopPlatformPage | null,
    private background: DesktopPlatformBackground | null,
  ) {}

  static content(): DesktopPlatform {
    return new DesktopPlatform(null, null);
  }

  static page(page: DesktopPlatformPage): DesktopPlatform {
    return new DesktopPlatform(page, null);
  }

  static background(
    page: DesktopPlatformPage,
    background: DesktopPlatformBackground,
  ): DesktopPlatform {
    return new DesktopPlatform(page, background);
  }

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
    async (req: TTSRequest) => {
      await this.page!.playTTS(req);
    },
  );

  readonly translate = NonContentScriptFunction("DesktopPlatform.translate", (text: string) => {
    return this.page!.translate(text);
  });

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  readonly migrateConfig = NonContentScriptFunction(
    "DesktopPlatform.migrateConfig",
    async () => {
      return this.page!.migrateConfig();
    },
  );

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
