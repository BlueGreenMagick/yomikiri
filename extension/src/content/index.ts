import "./initial";
import { Scanner } from "./scanner";
import { Api } from "~/api";
import { highlighter } from "@platform/highlight";
import { Tooltip } from "~/content/tooltip";
import Utils from "~/utils";

declare global {
  interface Window {
    scanner: Scanner;
    Api: typeof Api;
  }
}

const scanner = new Scanner();

/** Return false if not triggered on japanese text */
async function _trigger(x: number, y: number): Promise<boolean> {
  const result = await scanner.scanAt(x, y);
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

window.scanner = scanner;
window.Api = Api;
