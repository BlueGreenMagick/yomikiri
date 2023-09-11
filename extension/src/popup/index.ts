import "normalize.css";
import "./global.css";
import { Platform } from "@platform";
import PopupPage from "./PopupPage.svelte";
import { Theme } from "~/theme";
import Config from "~/config";
import Utils from "~/utils";
import { Api } from "~/api";
import { Backend } from "~/backend";

declare global {
  interface Window {
    Api: typeof Api;
    Utils: typeof Utils;
    Config: typeof Config;
  }
}

async function initialize() {
  Api.initialize({ context: "popup" });
  Platform.initialize();
  await Config.initialize();
  Theme.insertStyleElement(document);
  await Backend.initialize();
}

let initialized = initialize();

const page = new PopupPage({ target: document.body, props: { initialized } });

window.Api = Api;
window.Utils = Utils;
window.Config = Config;
