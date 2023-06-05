import { Scanner } from "./scanner";
import Api from "~/api";
import TooltipSvelte from "tooltip/Tooltip.svelte";
import { highlighter } from "@platform/highlight";

Api.initialize({ tab: false });

const scanner = new Scanner();

//@ts-ignore
window.scanner = scanner;

async function _trigger(x: number, y: number) {
  const result = await scanner.scanAt(x, y);
  if (result === null) return;
  if (result.dicEntries.length === 0) {
    highlighter.highlightRed(result.range);
    tooltipSvelte.hide();
    return;
  }
  highlighter.highlight(result.range);
  tooltipSvelte.show(result.dicEntries, result, x, y);
}

let running: boolean = false;
let next: [number, number] | null = null;

async function trigger(x: number, y: number) {
  if (!running) {
    running = true;
    const ret = _trigger(x, y);
    ret.finally(() => {
      running = false;
      if (next !== null) {
        const [nx, ny] = next;
        next = null;
        trigger(nx, ny);
      }
    });
    return ret;
  } else {
    next = [x, y];
  }
}

/** Attach tooltip element to document */
const tooltipSvelte = new TooltipSvelte({
  target: document.body,
  props: {},
});

document.addEventListener("mousemove", async (ev) => {
  if (ev.shiftKey) {
    await trigger(ev.clientX, ev.clientY);
  }
});

document.addEventListener("click", async (ev: MouseEvent) => {
  if (Api.isTouchScreen) {
    await trigger(ev.clientX, ev.clientY);
  }
});

// @ts-ignore
window.Api = Api;
