import { BrowserApi } from "~/browserApi";
import OptionsPage from "./OptionsPage.svelte";
import { Platform } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";
import { updated } from "./stores";
import { Backend } from "~/backend";

declare global {
  interface Window {
    Api: typeof BrowserApi;
    Utils: typeof Utils;
    AnkiApi: typeof AnkiApi;
    Config: typeof Config;
    openAnkiInfoModal: () => void;
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

const optionsPage = new OptionsPage({
  target: document.body,
  props: { initialized },
});

window.Api = BrowserApi;
window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
window.Backend = Backend;
