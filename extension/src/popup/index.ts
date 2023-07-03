import "./global.css";
import { Platform } from "@platform";
import { Api } from "~/api";
import Popup from "./Popup.svelte";
import { Theme } from "~/theme";

if (Platform.IS_IOS) {
  document.documentElement.classList.add("ios");
}
if (Platform.IS_DESKTOP) {
  document.documentElement.classList.add("desktop");
}
Theme.insertStyleElement(document);

Api.initialize({ context: "page" });

const svelte = new Popup({ target: document.body, props: {} });
