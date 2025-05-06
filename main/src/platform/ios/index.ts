import { type StoredConfiguration } from "@/features/config";
import { LazyAsync, handleResponseMessage, log } from "@/features/utils";
import {
  NonContentScriptFunction,
  currentTab,
  extensionManifest,
  getStorage,
  handleStorageChange,
  setStorage,
  updateTab,
} from "@/features/extension/browserApi";
import type { IPlatform, TTSVoice, VersionInfo, TTSRequest } from "../types";
import { getTranslation } from "../shared/translate";
import { migrateConfigObject } from "@/features/compat";
import { EXTENSION_CONTEXT, PLATFORM } from "consts";
import { YomikiriError } from "@/features/error";
import type { RunMessageMap } from "@/platform/shared/backend";

export * from "../types";

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

export namespace IosPlatform {
  export const type = "ios";

  // config migration is done only once even if requested multiple times
  const configMigration = new LazyAsync<StoredConfiguration>(async () => {
    return await migrateConfigInner();
  });

  const iosVersion = getIosVersion();
  log("ios version: ", iosVersion);

  /** Only works in background & page */
  export async function requestToApp<K extends keyof AppMessageMap>(
    key: K,
    request: AppRequest<K>,
  ): Promise<AppResponse<K>> {
    // eslint-disable-next-line
    const resp = await browser.runtime.sendNativeMessage("_", {
      key,
      request: JSON.stringify(request),
    });
    // eslint-disable-next-line
    const jsonResponse = handleResponseMessage<string>(resp);
    return JSON.parse(jsonResponse) as AppResponse<K>;
  }

  export const getConfig = NonContentScriptFunction("loadConfig", () => {
    return updateConfig();
  });

  /**
   * Listens to web config changes,
   * which may occur when a new script loads and app config is fetched
   */
  export function subscribeConfig(
    subscriber: (config: StoredConfiguration) => void,
  ): void {
    handleStorageChange("config", (change) => {
      subscriber(change.newValue as StoredConfiguration);
    });
  }

  // App config is the source of truth
  async function updateConfig(): Promise<StoredConfiguration> {
    const webConfigP = getStorage("config", {});
    const appConfigP = requestToApp("loadConfig", null);
    const [webConfig, appConfig] = await Promise.all([webConfigP, appConfigP]);
    if (webConfig != appConfig) {
      await setStorage("config", appConfig);
    }
    return appConfig;
  }

  export const saveConfig = NonContentScriptFunction(
    "saveConfig",
    async (config) => {
      await requestToApp("saveConfig", config);
      await setStorage("config", config);
    },
  );

  export async function openOptionsPage() {
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

  export function versionInfo(): VersionInfo {
    const manifest = extensionManifest();
    return {
      version: manifest.version,
    };
  }

  export async function japaneseTTSVoices(): Promise<TTSVoice[]> {
    return await requestToApp("ttsVoices", null);
  }

  export const playTTS = NonContentScriptFunction("tts", async (req) => {
    await requestToApp("tts", req);
  });

  export const translate = NonContentScriptFunction(
    "translate",
    getTranslation,
  );

  export function openExternalLink(url: string): void {
    window.open(url, "_blank")?.focus();
  }

  export const migrateConfig = NonContentScriptFunction(
    "migrateConfig",
    async () => {
      return await configMigration.get();
    },
  );

  async function migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await getConfig();
    const migrated = migrateConfigObject(configObject);
    await saveConfig(migrated);
    return migrated;
  }

  // workaround to ios 17.5+ bug where background script freezes after ~30s of non-stop activity
  // https://github.com/alexkates/content-script-non-responsive-bug/issues/1
  function setupIosPeriodicReload() {
    if (PLATFORM !== "ios" || EXTENSION_CONTEXT !== "background") return;
    if (iosVersion === null) return;
    if (iosVersion[0] !== 17 || iosVersion[1] < 5) return;

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

  if (EXTENSION_CONTEXT === "background") {
    setupIosPeriodicReload();
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

IosPlatform satisfies IPlatform;
export const Platform = IosPlatform;
export const ExtensionPlatform = Platform;
