import type { StoredConfiguration } from "@/features/config";
import { YomikiriError } from "@/features/error";
import {
  currentTab,
  extensionManifest,
  handleStorageChange,
  NonContentScriptFunction,
  updateTab,
} from "@/features/extension";
import { log } from "@/features/utils";
import { EXTENSION_CONTEXT, PLATFORM } from "consts";
import type { IPlatform, TTSRequest, TTSVoice, VersionInfo } from "../types";
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

  async getStoreBatch(
    keys: string[],
  ): Promise<Record<string, unknown>> {
    const result = await this._getStoreBatch(keys);

    return Object.fromEntries(
      Object.entries(result).map((
        [key, value],
      ) => [key, value === null ? null : JSON.parse(value)]),
    );
  }

  async getStore<T>(key: string): Promise<T | null> {
    const result = await this._getStoreBatch([key]);
    const value = result[key];
    if (value === null) return value;
    return JSON.parse(value) as T;
  }

  private readonly _getStoreBatch = NonContentScriptFunction(
    "IosPlatform.getStoreBatch",
    async (keysJson: string[]) => {
      return await this.page!.messaging.send("getStoreBatch", keysJson);
    },
  );

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

  /**
   * If value is `null` or `undefined`, deletes the store.
   */
  readonly setStore = NonContentScriptFunction(
    "IosPlatform.setStore",
    this.page!.setStore.bind(this.page),
  );

  private readonly _setStoreBatch = NonContentScriptFunction(
    "IosPlatform.setStoreBatch",
    this.page!._setStoreBatch.bind(this.page),
  );

  readonly getConfig = NonContentScriptFunction(
    "IosPlatform.loadConfig",
    this.page!.getConfig.bind(this.page),
  );

  /**
   * Listens to web config changes,
   * which may occur when a new script loads and app config is fetched
   */
  subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfiguration);
    });
  }

  readonly saveConfig = NonContentScriptFunction(
    "IosPlatform.saveConfig",
    this.page!.saveConfig.bind(this.page),
  );

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
    return await this.page!.messaging.send("ttsVoices", null);
  }

  readonly playTTS = NonContentScriptFunction("IosPlatform.tts", async (req: TTSRequest) => {
    await this.page!.messaging.send("tts", req);
  });

  readonly translate = NonContentScriptFunction(
    "IosPlatform.translate",
    this.page!.translate.bind(this.page),
  );

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  readonly migrateConfig = NonContentScriptFunction(
    "IosPlatform.migrateConfig",
    this.page!.migrateConfig.bind(this.page),
  );

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
