import OptionsPage from "../components/options/OptionsPage.svelte";
import { Platform } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";
import { updated } from "../components/options/stores";
import { Backend } from "~/backend";

declare global {
  interface Window {
    Utils: typeof Utils;
    AnkiApi: typeof AnkiApi;
    Config: typeof Config;
    Backend: typeof Backend;
  }
}

async function initialize() {
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

window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
window.Backend = Backend;
