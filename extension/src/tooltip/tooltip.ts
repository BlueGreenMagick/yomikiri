import Utils from "utils";
import type { Entry } from "~/dictionary";
import EntriesView from "./EntriesView.svelte";
import { AnkiNoteBuilder, type MarkerData } from "~/anki";
import type { ScanResult } from "~/content/scanner";
import Api from "~/api";
import { highlighter } from "@platform/highlight";

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
    if (_tooltipEl === undefined) {
      await createTooltipIframe();
    }
    _scanResult = scanned;
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

  /** position tooltip next to rect */
  async function position(rect: DOMRect) {
    const tooltip = getTooltipEl();
    // reset tooltipEl style beforehand so tooltip does not affect document size.
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    tooltip.style.width = Math.min(500, window.innerWidth) + "px";
    tooltip.style.removeProperty("transform");

    // calculate frame size
    let content = tooltip.contentDocument?.getElementById(
      "yomikiri-entriesview"
    ) as HTMLElement;
    const width = content.scrollWidth;
    const height = content.scrollHeight;
    tooltip.style.width = width + "px";
    tooltip.style.height = height + "px";

    // calculate frame position
    const rootRect = document.documentElement.getBoundingClientRect();
    const rectLeft = rect.left - rootRect.left;
    const rectTop = rect.top - rootRect.top;
    const rectBottom = rectTop + rect.height;
    const spaceTop = rect.top;
    const spaceBottom = window.innerHeight - rect.bottom;
    // min margin between tooltip and window
    const MARGIN = 10;
    // space between highlighted rect and tooltip
    const VERTICAL_SPACE = 6;
    const MAX_HEIGHT = 300;
    const BOTTOM_ADVANTAGE = 150;

    tooltip.style.left =
      Math.min(rectLeft, rootRect.width - MARGIN - width) + "px";
    // default to below text, but above text if space is too small
    if (
      (spaceBottom > MAX_HEIGHT ||
        spaceTop < MAX_HEIGHT + MARGIN ||
        spaceTop < spaceBottom + BOTTOM_ADVANTAGE) &&
      rectBottom + VERTICAL_SPACE + height <= rootRect.height
    ) {
      tooltip.style.top = rectBottom + VERTICAL_SPACE + "px";
    } else {
      tooltip.style.top = rectTop - VERTICAL_SPACE + "px";
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
