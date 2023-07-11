import "./initial";
import { Scanner } from "./scanner";
import { Api } from "~/api";
import { highlighter } from "@platform/highlight";
import { Tooltip } from "~/content/tooltip";
import Utils from "~/utils";
import Config from "~/config";

const scanner = new Scanner();

//@ts-ignore
window.scanner = scanner;

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
  if (ev.shiftKey) {
    await trigger(ev.clientX, ev.clientY);
  }
});

document.addEventListener("click", async (ev: MouseEvent) => {
  if (Api.isTouchScreen) {
    const triggered = await trigger(ev.clientX, ev.clientY);
    if (triggered === false) {
      Tooltip.hide();
      highlighter.unhighlight();
    }
  }
});

// @ts-ignore
window.Api = Api;
