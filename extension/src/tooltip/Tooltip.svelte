<script lang="ts">
  import Utils from "utils";
  import type { Entry } from "../dictionary";
  import EntryView from "./EntryView.svelte";
  import { tick, onMount, onDestroy } from "svelte";

  const BOTTOM_HEIGHT_THRESHOLD = 500;

  let visible: boolean = false;
  let entries: Entry[] = [];
  let range: Range;
  let tooltipEl: HTMLDivElement;

  export async function show(
    e: Entry[],
    r: Range,
    mouseX: number,
    mouseY: number
  ) {
    visible = true;
    range = r;
    entries = e;

    const rect = findRectOfMouse(range, mouseX, mouseY);
    await position(rect);
  }

  export function hide() {
    visible = false;
  }

  function findRectOfMouse(
    range: Range,
    mouseX: number,
    mouseY: number
  ): DOMRect {
    const rects = range.getClientRects();
    for (const rect of rects) {
      if (Utils.rectContainsPoint(rect, mouseX, mouseY)) {
        return rect;
      }
    }
    return rects[0];
  }

  async function position(rect: DOMRect) {
    console.log("position");
    // reset tooltipEl style beforehand so tooltip does not affect document size.
    tooltipEl.style.left = "0px";
    tooltipEl.style.top = "0px";
    tooltipEl.style.removeProperty("right");
    tooltipEl.style.removeProperty("transform");

    await tick(); // let browser calculate dimension
    const docRoot = document.documentElement;
    const dim = tooltipEl.getBoundingClientRect();
    const rectLeft = rect.left + docRoot.scrollLeft - docRoot.clientLeft;
    const rectBottom = rect.bottom + docRoot.scrollTop - docRoot.clientTop;
    const rectTop = rect.top + docRoot.scrollTop - docRoot.clientTop;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceTop = rect.top;

    if (rectLeft + dim.width <= docRoot.scrollWidth) {
      tooltipEl.style.left = rectLeft + "px";
    } else {
      tooltipEl.style.removeProperty("left");
      tooltipEl.style.right = "0px";
    }

    if (
      rectBottom + 5 + dim.height <= docRoot.scrollHeight &&
      (spaceBottom > BOTTOM_HEIGHT_THRESHOLD + 5 || spaceBottom > spaceTop)
    ) {
      tooltipEl.style.top = rectBottom + 5 + "px";
    } else {
      tooltipEl.style.top = rectTop - 5 + "px";
      tooltipEl.style.transform = "translateY(-100%)";
    }
  }

  onMount(() => {
    // add ResizeObserver to document and change position on document resize
    let repositionRequested: boolean = false;
    const resizeObserver = new ResizeObserver((_) => {
      if (!range || repositionRequested) return;
      const rect = range.getClientRects()[0];
      repositionRequested = true;
      requestAnimationFrame(() => {
        position(rect);
        repositionRequested = false;
      });
    });

    resizeObserver.observe(document.documentElement);
    return () => {
      resizeObserver.disconnect();
    };
  });
</script>

<div bind:this={tooltipEl} style:visibility={visible ? "visible" : "hidden"}>
  {#each entries as entry}
    <EntryView {entry} />
  {/each}
</div>

<style>
  div {
    position: absolute;
    max-width: calc(min(500px, 100vw));
    min-width: 300px;
    background-color: white;
    border: 1px solid black;
    z-index: 999;
    max-height: 300px;
    overflow-y: auto;
  }

  div > :global(div) {
    border-top: 1px solid lightgray;
    margin-top: 15px;
  }

  div > :global(div:first-child) {
    border-top: none;
    margin-top: 0px;
  }
</style>
