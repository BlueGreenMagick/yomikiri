import "@platform";
import DictionaryPage from "./DictionaryPage.svelte";
import { Theme } from "~/theme";
import Config from "~/config";
import Utils from "~/utils";
import { Api } from "~/api";
import { Platform } from "@platform";
import { Backend } from "~/backend";

declare global {
  interface Window {
    Api: typeof Api;
    Utils: typeof Utils;
    Config: typeof Config;
  }
}

async function initialize() {
  Api.initialize({ context: "page" });
  Platform.initialize();
  await Config.initialize();
  await Backend.initialize();
  Theme.insertStyleElement(document);
}

const initialized = initialize();

const page = new DictionaryPage({
  target: document.body,
  props: { initialized },
});

window.Api = Api;
window.Utils = Utils;
window.Config = Config;
