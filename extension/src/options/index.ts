import "normalize.css";
import "./global.css";
import "./initial";
import { Api } from "~/api";
import OptionsSvelte from "./Options.svelte";
import { AnkiApi } from "@platform/anki";
import { Theme } from "~/theme";
import { updated, ankiTemplateModalHidden } from "./stores";
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

updated.subscribe((_) => Theme.insertStyleElement(document));

const optionsSvelte = new OptionsSvelte({
  target: document.body,
  props: {},
});

window.openAnkiInfoModal = () => {
  ankiTemplateModalHidden.set(false);
};

window.Api = Api;
window.Utils = Utils;
window.AnkiApi = AnkiApi;
window.Config = Config;
