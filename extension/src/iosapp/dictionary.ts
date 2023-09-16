import "@platform";
import DictionaryPage from "./DictionaryPage.svelte";
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
    show(sentence: string): void;
  }
}

const [showPromise, showResolve] = Utils.createPromise<void>();

async function initialize(): Promise<void> {
  Api.initialize({ context: "page" });
  Platform.initialize();
  await Config.initialize();
  await Backend.initialize();
  Theme.insertStyleElement(document);
  await showPromise;
}

const initialized = initialize();

const page = new DictionaryPage({
  target: document.body,
  props: { initialized },
});

function show(sentence: string) {
  page.setSentence(sentence);
  showResolve();
}

window.Api = Api;
window.Utils = Utils;
window.Config = Config;
window.show = show;
