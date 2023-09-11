import "./global.css";
import { Api } from "~/api";
import { Platform } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";
import IosAnkiTemplatePage from "./IosAnkiTemplatePage.svelte";

declare global {
  interface Window {
    Api: typeof Api;
    Utils: typeof Utils;
    AnkiApi: typeof AnkiApi;
    Config: typeof Config;
  }
}

async function initialize() {
  Api.initialize({ context: "page" });
  Platform.initialize();
  await Config.initialize();
}

let initialized = initialize();

const mainSvelte = new IosAnkiTemplatePage({
  target: document.body,
  props: { initialized },
});

window.Api = Api;
window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
