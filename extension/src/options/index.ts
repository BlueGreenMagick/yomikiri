import { Api } from "~/api";
import OptionsPage from "./OptionsPage.svelte";
import { Platform } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";
import { updated } from "./stores";
import { Theme } from "~/theme";
import { Backend } from "~/backend";

declare global {
  interface Window {
    Api: typeof Api;
    Utils: typeof Utils;
    AnkiApi: typeof AnkiApi;
    Config: typeof Config;
    openAnkiInfoModal: () => void;
    Backend: typeof Backend;
  }
}

async function initialize() {
  Api.initialize({ context: "page" });
  Platform.initialize();
  await Config.initialize();
  updated.subscribe((_) => {
    Theme.insertStyleElement(document);
  });
  Theme.insertStyleElement(document);
  await Backend.initialize();
}

let initialized = initialize();

const optionsPage = new OptionsPage({
  target: document.body,
  props: { initialized },
});

window.Api = Api;
window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
window.Backend = Backend;
