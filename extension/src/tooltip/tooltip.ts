import Utils from "utils";
import type { Entry } from "~/dictionary";
import EntriesView from "./EntriesView.svelte";
import { AnkiNoteBuilder, type MarkerData } from "~/anki";
import type { ScanResult } from "~/content/scanner";
import Api from "~/api";
import { highlighter } from "@platform/highlight";

const BOTTOM_HEIGHT_THRESHOLD = 500;

export namespace Tooltip {
  let _scanResult: ScanResult;
  let _tooltipEl: HTMLIFrameElement;
  let _entriesView: EntriesView;

  export async function show(
    e: Entry[],
    scanned: ScanResult,
    mouseX: number,
    mouseY: number
  ) {
    _scanResult = scanned;
    if (_tooltipEl === undefined) {
      await createTooltipIframe();
    }

    _tooltipEl.style.display = "block";
    _entriesView.setEntries(e);
    const rect = findRectOfMouse(scanned.range, mouseX, mouseY);
    await position(rect);
  }

  export function hide() {
    const tooltip = getTooltipEl();
    tooltip.style.display = "none";
  }

  async function createTooltipIframe(): Promise<HTMLIFrameElement> {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.maxWidth = "calc(min(500px, 100vw))";
    iframe.style.minWidth = "300px";
    iframe.style.maxHeight = "300px";
    iframe.style.backgroundColor = "white";
    iframe.style.border = "1px solid black";
    iframe.style.zIndex = "2147483647";
    iframe.style.boxShadow = "0 0 4px rgba(0, 0, 0, 0.4)";
    iframe.style.display = "block";
    document.body.appendChild(iframe);
    _tooltipEl = iframe;

    attachResizeObserver();

    const iframeDoc = iframe.contentDocument as Document;
    if (iframeDoc.readyState === "complete") {
      setupEntriesView(iframe);
      return iframe;
    } else {
      const [promise, resolve] = Utils.createPromise<HTMLIFrameElement>();
      iframe.addEventListener("load", () => {
        setupEntriesView(iframe);
        resolve(iframe);
      });
      return promise;
    }
  }

  let _repositionRequested: boolean = false;
  /** add ResizeObserver to document and change position on document resize */
  function attachResizeObserver() {
    const resizeObserver = new ResizeObserver((_) => {
      if (!_scanResult || _repositionRequested) return;
      const rect = _scanResult.range.getClientRects()[0];
      _repositionRequested = true;
      requestAnimationFrame(() => {
        position(rect);
        _repositionRequested = false;
      });
    });
    resizeObserver.observe(document.documentElement);
  }

  function getTooltipEl(): HTMLIFrameElement {
    return _tooltipEl as HTMLIFrameElement;
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
    const tooltip = getTooltipEl();
    // reset tooltipEl style beforehand so tooltip does not affect document size.
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    tooltip.style.removeProperty("right");
    tooltip.style.removeProperty("transform");
    tooltip.style.width = Math.min(500, window.innerWidth) + "px";

    // calculate frame size
    const dim = tooltip.contentDocument
      ?.getElementById("yomikiri-entriesview")
      ?.getBoundingClientRect() as DOMRect;
    tooltip.style.width = dim.width + "px";
    tooltip.style.height = dim.height + "px";

    // calculate frame position
    const docRoot = document.documentElement;
    const rectLeft = rect.left + docRoot.scrollLeft - docRoot.clientLeft;
    const rectBottom = rect.bottom + docRoot.scrollTop - docRoot.clientTop;
    const rectTop = rect.top + docRoot.scrollTop - docRoot.clientTop;
    const spaceBottom = window.innerHeight - rect.bottom;
    const spaceTop = rect.top;

    if (rectLeft + dim.width <= docRoot.scrollWidth) {
      tooltip.style.left = rectLeft + "px";
    } else {
      tooltip.style.removeProperty("left");
      tooltip.style.right = "0px";
    }

    if (
      rectBottom + 5 + dim.height <= docRoot.scrollHeight &&
      (spaceBottom > BOTTOM_HEIGHT_THRESHOLD + 5 || spaceBottom > spaceTop)
    ) {
      tooltip.style.top = rectBottom + 5 + "px";
    } else {
      tooltip.style.top = rectTop - 5 + "px";
      tooltip.style.transform = "translateY(-100%)";
    }
  }

  function setupEntriesView(tooltip: HTMLIFrameElement) {
    const doc = tooltip.contentDocument as Document;
    doc.head.innerHTML += `
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
html, body {
margin: 0;
padding: 0;
border: 0;
}
</style>
`;

    _entriesView = new EntriesView({
      target: doc.body,
    });
    console.log(typeof doc.getElementById("yomikiri-entriesview"));
    _entriesView.$on("close", (ev: CustomEvent<MouseEvent>) => {
      hide();
      highlighter.unhighlight();
    });
    _entriesView.$on(
      "addNote",
      async (ev: CustomEvent<Partial<MarkerData>>) => {
        const data = ev.detail;
        data.scanned = _scanResult;
        const note = await AnkiNoteBuilder.buildNote(data as MarkerData);
        await Api.request("addAnkiNote", note);
      }
    );
  }
}
