import "normalize.css";
import "./global.css";
import { Api } from "~/api";
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

const mainSvelte = new IosAnkiTemplatePage({
  target: document.body,
  props: {},
});

window.Api = Api;
window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
