import "normalize.css";
import "./global.css";
import "./initial";
import { Platform } from "@platform";
import Popup from "./Popup.svelte";
import { Theme } from "~/theme";
import Config from "~/config";
import Utils from "~/utils";
import { Api } from "~/api";

declare global {
  interface Window {
    Api: typeof Api;
    Utils: typeof Utils;
    Config: typeof Config;
  }
}

if (Platform.IS_IOS) {
  document.documentElement.classList.add("ios");
}
if (Platform.IS_DESKTOP) {
  document.documentElement.classList.add("desktop");
}

Theme.insertStyleElement(document);

const svelte = new Popup({ target: document.body, props: {} });

window.Api = Api;
window.Utils = Utils;
window.Config = Config;
