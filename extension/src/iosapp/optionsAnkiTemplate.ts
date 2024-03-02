import { Platform } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";
import OptionsAnkiTemplatePage from "./OptionsAnkiTemplatePage.svelte";

declare global {
  interface Window {
    Utils: typeof Utils;
    AnkiApi: typeof AnkiApi;
    Config: typeof Config;
  }
}

async function initialize() {
  Platform.initialize();
  await Config.initialize();
}

let initialized = initialize();

const mainSvelte = new OptionsAnkiTemplatePage({
  target: document.body,
  props: { initialized },
});

window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
