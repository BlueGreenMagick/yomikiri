import type { StoredConfigurationV1 } from "@/features/compat";
import type { StoredConfig } from "@/features/config";
import {
  extensionManifest,
  getStorage,
  handleStorageChange,
  japaneseTtsVoices,
  setStorage,
} from "@/features/extension";
import type { UserMigrateRequest, UserMigrateState } from "@yomikiri/backend-uniffi-bindings";
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

  async userMigrateStep(_req: UserMigrateRequest): Promise<UserMigrateState> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  async finishMigration(): Promise<void> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }
}
