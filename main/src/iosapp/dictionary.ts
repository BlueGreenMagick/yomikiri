import "@platform";
import DictionaryPage from "./DictionaryPage.svelte";
import Config from "~/config";
import Utils from "~/utils";
import { Platform } from "@platform";
import { Backend } from "@platform/backend";

declare global {
  interface Window {
    Utils: typeof Utils;
    Config: typeof Config;
  }
}

interface URLParams {
  context: "app" | "action";
  search?: string;
}

const initialized = initialize();
createSvelte(initialized);

async function initialize(): Promise<void> {
  Platform.initialize();
  await Config.initialize();
  Config.setStyle(document);
  await Backend.initialize();
}

function createSvelte(initialized: Promise<void>): DictionaryPage {
  let params = new URLSearchParams(window.location.search);
  let context = params.get("context") as "app" | "action";
  let searchText = params.get("search") ?? "";
  return new DictionaryPage({
    target: document.body,
    props: { initialized, context, searchText },
  });
}

window.Utils = Utils;
window.Config = Config;
