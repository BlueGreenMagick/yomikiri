import "normalize.css";
import "./global.css";
import { Api } from "~/api";
import OptionsPage from "./OptionsPage.svelte";
import { Platform } from "@platform";
import { AnkiApi } from "@platform/anki";
import Utils from "~/utils";
import Config from "~/config";

declare global {
  interface Window {
    Api: typeof Api;
    Utils: typeof Utils;
    AnkiApi: typeof AnkiApi;
    Config: typeof Config;
    openAnkiInfoModal: () => void;
  }
}

function initialize() {
  Api.initialize({ context: "page" });
  Platform.initialize();
}

initialize();

const optionsPage = new OptionsPage({
  target: document.body,
  props: {},
});

window.Api = Api;
window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
