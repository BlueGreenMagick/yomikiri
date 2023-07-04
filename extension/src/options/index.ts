import "./global.css";
import "./initial";
import { Api } from "~/api";
import OptionsSvelte from "./Options.svelte";
import AnkiApi from "@platform/anki";
import { Theme } from "~/theme";
import { updated, ankiTemplateModalHidden } from "./stores";

updated.subscribe((_) => Theme.insertStyleElement(document));

const optionsSvelte = new OptionsSvelte({
  target: document.body,
  props: {},
});

// @ts-ignore
window.openAnkiInfoModal = () => {
  ankiTemplateModalHidden.set(false);
};

// @ts-ignore
window.Api = Api;
// @ts-ignore
window.AnkiApi = AnkiApi;
