/* desktop only */

import { BrowserApi } from "~/extension/browserApi";
import OptionsPage from "../../components/options/OptionsPage.svelte";
import { Platform } from "~/platform/desktop";
import { AnkiApi, DesktopAnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";
import { Backend } from "@platform/backend";
import type { DesktopDictionary } from "~/platform/common/dictionary";

declare global {
  interface Window {
    browserApi: BrowserApi;
    platform: Platform;
    Utils: typeof Utils;
    AnkiApi: typeof DesktopAnkiApi;
    Config: typeof Config;
    Backend: typeof Backend;
  }
}

const browserApi = new BrowserApi({ context: "page" });
const platform = new Platform(browserApi)

async function initialize(): Promise<[Config, DesktopAnkiApi, DesktopDictionary]> {
  const config = await Config.initialize(platform);
  config.setStyle(document);
  const ankiApi = platform.newAnkiApi(config);
  const dictionary = platform.newDictionary()
  return [config, ankiApi, dictionary]
}

const initialized = initialize();

const _optionsPage = new OptionsPage({
  target: document.body,
  props: { platform, initialized },
});

window.browserApi = browserApi;
window.platform = platform;
window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
window.Backend = Backend;
