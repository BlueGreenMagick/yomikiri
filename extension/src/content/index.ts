import { Scanner } from "./scanner";
import { highlightRange } from "./highlight";
import { Entry } from "~/dictionary";
import Api from "~/api";
import TooltipSvelte from "tooltip/Tooltip.svelte";

const scanner = new Scanner();

async function _trigger(x: number, y: number) {
  const result = await scanner.scanAt(x, y);
  if (result === null) return;
  let entries = (await Api.request("searchTerm", result.token.base_form)).map(
    (o) => new Entry(o)
  );
  if (entries.length === 0) return;
  tooltipSvelte.show(entries, result, x, y);
  highlightRange(result.range);
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
