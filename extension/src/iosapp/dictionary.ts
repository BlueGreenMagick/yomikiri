import "normalize.css";
import "./dictionary.css";
import "@platform";
import Dictionary from "./Dictionary.svelte";
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

const svelte = new Dictionary({
  target: document.body,
  props: { initialized },
});

window.Api = Api;
window.Utils = Utils;
window.Config = Config;
