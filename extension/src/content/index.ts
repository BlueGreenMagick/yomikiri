import { Scanner } from "./scanner";
import { Entry } from "../dictionary";
import Api from "../api";
import TooltipSvelte from "tooltip/Tooltip.svelte";

const scanner = new Scanner();
const tooltipSvelte = new TooltipSvelte({
  target: document.body,
  props: {},
});

async function trigger(x: number, y: number) {
  const result = await scanner.scanAt(x, y);
  if (result === null) return;
  let entries = (await Api.request("searchTerm", result.token.base_form)).map(
    (o) => new Entry(o)
  );
  if (entries.length === 0) return;
  tooltipSvelte.show(entries, result.range);
}

document.addEventListener("mousemove", (ev) => {
  if (ev.shiftKey) {
    trigger(ev.clientX, ev.clientY);
  }
});
