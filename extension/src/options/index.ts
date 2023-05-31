import "./global.css";
import Api from "~/api";
import OptionsSvelte from "./Options.svelte";
import Utils from "~/utils";
import AnkiApi from "@platform/anki";

const optionsSvelte = new OptionsSvelte({
  target: document.body,
  props: {},
});

// @ts-ignore
window.Api = Api;
// @ts-ignore
window.AnkiApi = AnkiApi;
