import { migrateConfigObject, type StoredCompatConfiguration } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import { YomikiriError } from "@/features/error";
import {
  currentTab,
  extensionManifest,
  getStorage,
  handleStorageChange,
  NonContentScriptFunction,
  setStorage,
  updateTab,
} from "@/features/extension";
import { LazyAsync, log } from "@/features/utils";
import type { RunMessageMap } from "@/platform/shared/backend";
import { getTranslation } from "@/platform/shared/translate";
import { EXTENSION_CONTEXT, PLATFORM } from "consts";
import type { IPlatform, JSONStoreValues, TTSRequest, TTSVoice, VersionInfo } from "../types";
import { sendMessage } from "./messaging";

/** Type map for messages sent with `requestToApp()`*/
export interface AppMessageMap extends RunMessageMap {
  loadConfig: [null, StoredConfiguration];
  saveConfig: [StoredConfiguration, null];
  ttsVoices: [null, TTSVoice[]];
  tts: [TTSRequest, null];
  iosVersion: [null, IosVersion];
}

export type AppRequest<K extends keyof AppMessageMap> = AppMessageMap[K][0];
export type AppResponse<K extends keyof AppMessageMap> = AppMessageMap[K][1];

interface IosVersion {
  major: number;
  minor: number;
  patch: number;
}

export class IosPlatform implements IPlatform {
  readonly type = "ios";

  // config migration is done only once even if requested multiple times
  private readonly configMigration = new LazyAsync<StoredConfiguration>(
    async () => {
      return await this.migrateConfigInner();
    },
  );

  private iosVersion = getIosVersion();

  constructor() {
    log("ios version: ", this.iosVersion);

    if (EXTENSION_CONTEXT === "background") {
      this.setupIosPeriodicReload();
    }
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
      return await sendMessage("getStoreBatch", keysJson);
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
  async setStore(key: string, value: unknown) {
    const jsonMap = {
      [key]: (value === null || value === undefined) ? null : JSON.stringify(value),
    };
    await this._setStoreBatch(jsonMap);
  }

  private readonly _setStoreBatch = NonContentScriptFunction(
    "IosPlatform.setStoreBatch",
    async (jsonMap: JSONStoreValues) => {
      await sendMessage("setStoreBatch", jsonMap);
    },
  );

  readonly getConfig = NonContentScriptFunction("IosPlatform.loadConfig", () => {
    return this.updateConfig();
  });

  /**
   * Listens to web config changes,
   * which may occur when a new script loads and app config is fetched
   */
  subscribeConfig(subscriber: (config: StoredConfiguration) => void): void {
    handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfiguration);
    });
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

  readonly saveConfig = NonContentScriptFunction(
    "IosPlatform.saveConfig",
    async (config: StoredConfiguration) => {
      await this.setStore("web_config", config);
      await setStorage("config", config);
    },
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
    return await sendMessage("ttsVoices", null);
  }

  readonly playTTS = NonContentScriptFunction("IosPlatform.tts", async (req: TTSRequest) => {
    await sendMessage("tts", req);
  });

  readonly translate = NonContentScriptFunction("IosPlatform.translate", getTranslation);

  openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  readonly migrateConfig = NonContentScriptFunction(
    "IosPlatform.migrateConfig",
    async () => {
      return await this.configMigration.get();
    },
  );

  private async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await this.getConfig();
    const migrated = migrateConfigObject(configObject);
    await this.saveConfig(migrated);
    return migrated;
  }

  // workaround to ios 17.5+ bug where background script freezes after ~30s of non-stop activity
  // https://github.com/alexkates/content-script-non-responsive-bug/issues/1
  setupIosPeriodicReload() {
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
