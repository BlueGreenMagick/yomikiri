import "normalize.css";
import "./global.css";
import "./initial";
import { Platform } from "@platform";
import Popup from "./Popup.svelte";
import { Theme } from "~/theme";
import Config from "~/config";
import Utils from "~/utils";

if (Platform.IS_IOS) {
  document.documentElement.classList.add("ios");
}
if (Platform.IS_DESKTOP) {
  document.documentElement.classList.add("desktop");
}

Theme.insertStyleElement(document);

const svelte = new Popup({ target: document.body, props: {} });

// @ts-ignore
window.Utils = Utils;
// @ts-ignore
window.Config = Config;
