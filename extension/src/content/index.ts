import { Scanner } from "./scanner";
import { Api } from "~/api";
import { highlighter } from "@platform/highlight";
import { Tooltip } from "~/content/tooltip";
import Utils from "~/utils";
import Config from "~/config";
import { Platform } from "@platform";

declare global {
  interface Window {
    Scanner: typeof Scanner;
    Api: typeof Api;
    ensureInitialized: typeof ensureInitialized;
  }
}

let _initialized: Promise<void> | undefined;

async function _initialize() {
  Api.initialize({ context: "contentScript" });
  Platform.initialize();
  await Config.initialize();
}

async function ensureInitialized() {
  if (_initialized === undefined) {
    _initialized = _initialize();
  }
  return _initialized;
}

/** Return false if not triggered on japanese text */
async function _trigger(x: number, y: number): Promise<boolean> {
  await ensureInitialized();

  const result = await Scanner.scanAt(x, y);
  if (result === null) return false;
  console.log(result);
  if (result.dicEntries.length === 0) {
    highlighter.highlightRed(result.range);
    Tooltip.hide();
  } else {
    highlighter.highlight(result.range);
    await Tooltip.show(result.dicEntries, result, x, y);
  }
  return true;
}

const trigger = Utils.SingleQueued(_trigger);

document.addEventListener("mousemove", async (ev) => {
  // inside yomikiri tooltip
  if (document.documentElement.classList.contains("yomikiri")) {
    return;
  }

  if (ev.shiftKey) {
    await trigger(ev.clientX, ev.clientY);
  }
});

document.addEventListener("click", async (ev: MouseEvent) => {
  // inside yomikiri tooltip
  if (document.documentElement.classList.contains("yomikiri")) {
    return;
  }

  if (Api.isTouchScreen) {
    const triggered = await trigger(ev.clientX, ev.clientY);
    if (triggered === false) {
      Tooltip.hide();
      highlighter.unhighlight();
    }
  }
});

window.Scanner = Scanner;
window.Api = Api;
window.ensureInitialized = ensureInitialized;
