import type { StoredConfigurationV1 } from "@/features/compat";
import type { StoredConfig } from "@/features/config";
import {
  extensionManifest,
  getStorage,
  handleStorageChange,
  japaneseTtsVoices,
  setStorage,
} from "@/features/extension";
import type { IPlatform, TTSRequest, TTSVoice, VersionInfo } from "../types";
import type { DesktopPlatformBackground } from "./background/platform";
import { sendDesktopExtensionMessage } from "./message";
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

  async getConfig(): Promise<StoredConfigurationV1> {
    return await getStorage("config", {});
  }

  /** subscriber is called when config is changed. */
  subscribeConfig(subscriber: (config: StoredConfig) => void): void {
    handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfig);
    });
  }

  saveConfig(config: StoredConfig): Promise<void> {
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

  playTTS(req: TTSRequest) {
    if (this.page) {
      return this.page.playTTS(req);
    } else {
      return sendDesktopExtensionMessage("DesktopPlatform.playTTS", req);
    }
  }

  translate(text: string) {
    if (this.page) {
      return this.page.translate(text);
    } else {
      return sendDesktopExtensionMessage("DesktopPlatform.translate", text);
    }
  }

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  migrateConfig(): Promise<StoredConfig> {
    if (this.page) {
      return this.page.migrateConfig();
    } else {
      return sendDesktopExtensionMessage("DesktopPlatform.migrateConfig", undefined);
    }
  }

  setStoreBatch(req: Record<string, unknown>): Promise<void> {
    if (this.background) {
      return this.background.db.get().then((db) => db.store.setStoreBatch(req));
    } else {
      return sendDesktopExtensionMessage("DesktopPlatform.setStoreBatch", req);
    }
  }

  getStoreBatch(keys: string[]): Promise<Record<string, unknown>> {
    if (this.background) {
      return this.background.db.get().then((db) => db.store.getStoreBatch(keys));
    } else {
      return sendDesktopExtensionMessage("DesktopPlatform.getStoreBatch", keys);
    }
  }

  setStore(key: string, value: unknown): Promise<void> {
    if (this.background) {
      return this.background.db.get().then((db) => db.store.setStore(key, value));
    } else {
      return sendDesktopExtensionMessage("DesktopPlatform.setStore", { key, value });
    }
  }

  getStore(key: string): Promise<unknown> {
    if (this.background) {
      return this.background.db.get().then((db) => db.store.getStore(key));
    } else {
      return sendDesktopExtensionMessage("DesktopPlatform.getStore", key);
    }
  }
}
