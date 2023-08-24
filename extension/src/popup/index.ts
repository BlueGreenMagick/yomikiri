import "normalize.css";
import "./global.css";
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

function initialize() {
  Api.initialize({ context: "popup" });
  Platform.initialize();
}

initialize();

const svelte = new Popup({ target: document.body, props: {} });

window.Api = Api;
window.Utils = Utils;
window.Config = Config;
