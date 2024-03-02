import { BrowserApi } from "~/extension/browserApi";
import OptionsPage from "../../components/options/OptionsPage.svelte";
import { Platform } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";
import { updated } from "../../components/options/stores";
import { Backend } from "~/backend";

declare global {
  interface Window {
    Api: typeof BrowserApi;
    Utils: typeof Utils;
    AnkiApi: typeof AnkiApi;
    Config: typeof Config;
    Backend: typeof Backend;
  }
}

async function initialize() {
  BrowserApi.initialize({ context: "page" });
  Platform.initialize();
  await Config.initialize();
  updated.subscribe((_) => {
    Config.setStyle(document);
  });
  Config.setStyle(document);
  await Backend.initialize();
}

let initialized = initialize();

async function stateEnabledChanged(value: boolean): Promise<void> {
  await initialized;
  Config.set("state.enabled", value, false);
}

BrowserApi.handleRequest("stateEnabledChanged", stateEnabledChanged);

const optionsPage = new OptionsPage({
  target: document.body,
  props: { initialized },
});

window.Api = BrowserApi;
window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
window.Backend = Backend;
