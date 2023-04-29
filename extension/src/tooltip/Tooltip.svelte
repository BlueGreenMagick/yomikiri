<script lang="ts">
  import Utils from "utils";
  import type { Entry } from "~/dictionary";
  import { tick, onMount, onDestroy } from "svelte";
  import EntriesView from "./EntriesView.svelte";

  const BOTTOM_HEIGHT_THRESHOLD = 500;

  let visible: boolean = false;
  let width: number = 0;
  let height: number = 0;
  let range: Range;
  let tooltipEl: HTMLIFrameElement;
  let entriesView: EntriesView;

  export async function show(
    e: Entry[],
    r: Range,
    mouseX: number,
    mouseY: number
  ) {
    visible = true;
    range = r;
    entriesView.setEntries(e);
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
    // reset tooltipEl style beforehand so tooltip does not affect document size.
    tooltipEl.style.left = "0px";
    tooltipEl.style.top = "0px";
    tooltipEl.style.removeProperty("right");
    tooltipEl.style.removeProperty("transform");
    width = Math.min(500, window.innerWidth);

    await tick(); // let browser calculate dimension

    // calculate frame size
    const dim = tooltipEl.contentDocument
      ?.getElementById("yomikiri-entriesview")
      ?.getBoundingClientRect() as DOMRect;
    width = dim.width;
    height = dim.height;

    // calculate frame position
    const docRoot = document.documentElement;
    const rectLeft = rect.left + docRoot.scrollLeft - docRoot.clientLeft;
    const rectBottom = rect.bottom + docRoot.scrollTop - docRoot.clientTop;
    const rectTop = rect.top + docRoot.scrollTop - docRoot.clientTop;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceTop = rect.top;

    if (rectLeft + width <= docRoot.scrollWidth) {
      tooltipEl.style.left = rectLeft + "px";
    } else {
      tooltipEl.style.removeProperty("left");
      tooltipEl.style.right = "0px";
    }

    if (
      rectBottom + 5 + height <= docRoot.scrollHeight &&
      (spaceBottom > BOTTOM_HEIGHT_THRESHOLD + 5 || spaceBottom > spaceTop)
    ) {
      tooltipEl.style.top = rectBottom + 5 + "px";
    } else {
      tooltipEl.style.top = rectTop - 5 + "px";
      tooltipEl.style.transform = "translateY(-100%)";
    }
  }

  function setupEntriesView() {
    const doc = tooltipEl.contentDocument as Document;
    const style = doc.createElement("style");
    style.innerHTML = `
html, body {
  margin: 0;
  padding: 0;
  border: 0;
}`;
    doc.head.appendChild(style);

    entriesView = new EntriesView({
      target: (tooltipEl.contentDocument as Document).body,
    });
    entriesView.$on("close", (ev: Event) => {
      hide();
    });
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

    const iframeDoc = tooltipEl.contentDocument as Document;
    if (iframeDoc.readyState !== "complete") {
      tooltipEl.addEventListener("load", setupEntriesView);
    } else {
      setupEntriesView();
    }

    return () => {
      resizeObserver.disconnect();
    };
  });
</script>

<iframe
  title="Title"
  bind:this={tooltipEl}
  style:visibility={visible ? "visible" : "hidden"}
  style:width="{width}px"
  style:height="{height}px"
/>

<style>
  iframe {
    position: absolute;
    max-width: calc(min(500px, 100vw));
    min-width: 300px;
    background-color: white;
    border: 1px solid black;
    z-index: 999;
    max-height: 300px;
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
  }
</style>
