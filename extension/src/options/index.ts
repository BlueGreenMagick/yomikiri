import "./global.css";
import { Api } from "~/api";
import OptionsSvelte from "./Options.svelte";
import Utils from "~/utils";
import AnkiApi from "@platform/anki";
import { Theme } from "~/theme";
import { updated, ankiTemplateModalHidden } from "./stores";
import Config from "~/config";

async function initialize() {
  await Api.initialize({ context: "page" });
  await Config.initialize();
}

let initializing = initialize();

updated.subscribe((_) => Theme.insertStyleElement(document));

const optionsSvelte = new OptionsSvelte({
  target: document.body,
  props: { initializing },
});

// @ts-ignore
window.openAnkiInfoModal = () => {
  ankiTemplateModalHidden.set(false);
};

// @ts-ignore
window.Api = Api;
// @ts-ignore
window.AnkiApi = AnkiApi;
