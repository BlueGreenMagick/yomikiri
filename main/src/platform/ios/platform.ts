import type { StoredConfigurationV1 } from "@/features/compat";
import type { StoredConfig } from "@/features/config";
import { YomikiriError } from "@/features/error";
import {
  currentTab,
  extensionManifest,
  handleStorageChange,
  updateTab,
} from "@/features/extension";
import { log } from "@/features/utils";
import type { UserMigrateRequest, UserMigrateState } from "@yomikiri/backend-uniffi-bindings";
import { EXTENSION_CONTEXT, PLATFORM } from "consts";
import type { IPlatform, TranslateResult, TTSRequest, TTSVoice, VersionInfo } from "../types";
import { sendIosExtensionMessage } from "./extensionMessage";
import type { IosPlatformPage } from "./page/platform";

export class IosPlatform implements IPlatform {
  readonly type = "ios";

  private iosVersion = getIosVersion();

  private constructor(private readonly page: IosPlatformPage | null) {
    log("ios version: ", this.iosVersion);
  }

  static background(platformPage: IosPlatformPage): IosPlatform {
    const platform = new IosPlatform(platformPage);
    platform.setupIosPeriodicReload();
    return platform;
  }

  static page(platformPage: IosPlatformPage): IosPlatform {
    return new IosPlatform(platformPage);
  }

  static content(): IosPlatform {
    return new IosPlatform(null);
  }

  getConfig(): Promise<StoredConfigurationV1> {
    if (this.page) {
      return this.page.getConfig();
    } else {
      return sendIosExtensionMessage("IosPlatform.getConfig", undefined);
    }
  }

  /**
   * Listens to web config changes,
   * which may occur when a new script loads and app config is fetched
   */
  subscribeConfig(subscriber: (config: StoredConfig) => void): void {
    handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfig);
    });
  }

  saveConfig(config: StoredConfig): Promise<void> {
    if (this.page) {
      return this.page.saveConfig(config);
    } else {
      return sendIosExtensionMessage("IosPlatform.saveConfig", config);
    }
  }

  async openOptionsPage() {
    const OPTIONS_URL = "yomikiri://options";
    if (EXTENSION_CONTEXT !== "popup") {
      location.href = OPTIONS_URL;
    } else {
      const tab = await currentTab();
      if (tab.id === undefined) {
        throw new YomikiriError("Current tab does not have an id");
      }
      await updateTab(tab.id, { url: OPTIONS_URL });
      window.close();
    }
  }

  versionInfo(): VersionInfo {
    const manifest = extensionManifest();
    return {
      version: manifest.version,
    };
  }

  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    if (this.page) {
      return this.page.messaging.send("ttsVoices", null);
    } else {
      return sendIosExtensionMessage("IosPlatform.japaneseTTSVoices", undefined);
    }
  }

  async playTTS(req: TTSRequest): Promise<void> {
    if (this.page) {
      await this.page.messaging.send("tts", req);
    } else {
      return sendIosExtensionMessage("IosPlatform.playTTS", req);
    }
  }

  translate(text: string): Promise<TranslateResult> {
    if (this.page) {
      return this.page.translate(text);
    } else {
      return sendIosExtensionMessage("IosPlatform.translate", text);
    }
  }

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  migrateConfig(): Promise<StoredConfig> {
    if (this.page) {
      return this.page.migrateConfig();
    } else {
      return sendIosExtensionMessage("IosPlatform.migrateConfig", undefined);
    }
  }

  // workaround to ios 17.5+ bug where background script freezes after ~30s of non-stop activity
  // https://github.com/alexkates/content-script-non-responsive-bug/issues/1
  private setupIosPeriodicReload() {
    if (PLATFORM !== "ios" || EXTENSION_CONTEXT !== "background") return;
    if (this.iosVersion === null) return;
    if (this.iosVersion[0] !== 17 || this.iosVersion[1] < 5) return;

    log("Setting up periodic ios background script reload");

    let wakeup = Date.now();
    let last = Date.now();

    function checkReload() {
      const curr = Date.now();
      if (curr - last > 4000) {
        wakeup = curr;
      }
      last = curr;

      if (curr - wakeup > 25 * 1000) {
        log("Reloading extension");
        chrome.runtime.reload();
      }
    }
    setInterval(checkReload, 1000);
  }

  async userMigrateStep(args: UserMigrateRequest): Promise<UserMigrateState> {
    if (this.page) {
      return this.page.userMigrateStep(args);
    } else {
      return sendIosExtensionMessage("IosPlatform.userMigrateStep", args);
    }
  }
}

/** Returns null if ios version could not be retrieved from user agent. */
function getIosVersion(): [number, number, number] | null {
  const match = navigator?.userAgent?.match(/iPhone OS (\d+)_(\d+)(?:_(\d+))?/);
  if (match === null || match === undefined) {
    return null;
  }

  const [_all, major, minor, patch] = match;
  try {
    return [parseInt(major), parseInt(minor), parseInt(patch) || 0];
  } catch {
    return null;
  }
}
