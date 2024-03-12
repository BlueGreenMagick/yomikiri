import { Platform } from "@platform";
import PopupPage from "./PopupPage.svelte";
import Config from "~/config";
import Utils from "~/utils";
import { BrowserApi } from "~/extension/browserApi";
import { Backend } from "@platform/backend";

declare global {
  interface Window {
    Api: typeof BrowserApi;
    Utils: typeof Utils;
    Config: typeof Config;
    Platform: typeof Platform;
  }
}

async function initialize(): Promise<void> {
  BrowserApi.initialize({ context: "popup" });
  Platform.initialize();
  await Config.initialize();
  Config.setStyle(document);
  await Backend.initialize();
}

let initialized = initialize();

const page = new PopupPage({ target: document.body, props: { initialized } });

window.Api = BrowserApi;
window.Utils = Utils;
window.Config = Config;
window.Platform = Platform;
