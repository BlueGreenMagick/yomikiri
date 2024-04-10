import { Platform } from "@platform-ext";
import PopupPage from "./PopupPage.svelte";
import Config from "~/config";
import Utils from "~/utils";
import { BrowserApi } from "~/extension/browserApi";
import type { Backend } from "@platform/backend"

declare global {
  interface Window {
    browserApi: BrowserApi
    platform: Platform
    Utils: typeof Utils;
    Config: typeof Config;
    Platform: typeof Platform;
  }
}

const browserApi = new BrowserApi({ context: "popup" });
const platform = new Platform(browserApi)

async function initialize(): Promise<[Config, Backend]> {
  const config = await Config.initialize(platform)
  config.setStyle(document);
  const backend = await platform.newBackend()
  return [config, backend]
}

const initialized = initialize();

const _page = new PopupPage({ target: document.body, props: { platform, initialized } });

window.browserApi = browserApi
window.platform = platform
window.Utils = Utils;
window.Config = Config;
window.Platform = Platform;
