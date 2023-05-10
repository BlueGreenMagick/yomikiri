import { Scanner } from "./scanner";
import { highlightRange } from "./highlight";
import { Entry } from "~/dictionary";
import Api from "~/api";
import TooltipSvelte from "tooltip/Tooltip.svelte";

const scanner = new Scanner();

async function trigger(x: number, y: number) {
  const result = await scanner.scanAt(x, y);
  if (result === null) return;
  let entries = (await Api.request("searchTerm", result.token.base_form)).map(
    (o) => new Entry(o)
  );
  if (entries.length === 0) return;
  tooltipSvelte.show(entries, result, x, y);
  highlightRange(result.range);
}

/** Attach tooltip element to document */
const tooltipSvelte = new TooltipSvelte({
  target: document.body,
  props: {},
});

document.addEventListener("mousemove", (ev) => {
  if (ev.shiftKey) {
    trigger(ev.clientX, ev.clientY);
  }
});
