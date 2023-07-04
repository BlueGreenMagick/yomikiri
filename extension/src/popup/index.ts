import "./global.css";
import { Platform } from "@platform";
import { Api } from "~/api";
import Popup from "./Popup.svelte";
import { Theme } from "~/theme";
import Config from "~/config";

if (Platform.IS_IOS) {
  document.documentElement.classList.add("ios");
}
if (Platform.IS_DESKTOP) {
  document.documentElement.classList.add("desktop");
}

async function initialize() {
  await Api.initialize({ context: "page" });
  await Config.initialize();
  Theme.insertStyleElement(document);
}

let initializing = initialize();

const svelte = new Popup({ target: document.body, props: { initializing } });
