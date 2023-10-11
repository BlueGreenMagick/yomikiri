import Utils from "utils";
import {
  AnkiNoteBuilder,
  type MarkerData,
  type NoteData,
} from "~/ankiNoteBuilder";
import { BrowserApi } from "~/browserApi";
import { Highlighter } from "./highlight";
import { Toast } from "~/toast";
import TooltipSvelte from "./TooltipPage.svelte";
import type { TokenizeResult } from "~/backend";
import type { AddNoteForEntry } from "~/components/DicEntryView.svelte";
import Config from "~/config";
import { AnkiApi } from "@platform/anki";

export namespace Tooltip {
  let _tokenizeResult: TokenizeResult;
  let _highlightedNodes: Node[];
  let _tooltipEl: HTMLIFrameElement;
  let _tooltipSvelte: TooltipSvelte;

  export async function show(
    tokenizeResult: TokenizeResult,
    highlightedNodes: Node[],
    mouseX: number,
    mouseY: number
  ) {
    if (_tooltipEl === undefined) {
      await createTooltipIframe();
    }
    _tokenizeResult = tokenizeResult;
    _highlightedNodes = highlightedNodes;
    _tooltipEl.contentDocument?.scrollingElement?.scrollTo(0, 0);
    _tooltipEl.style.display = "block";
    _tooltipSvelte.setEntries(_tokenizeResult.entries);
    // fix bug where tooltip height is previous entry's height
    await 0;
    const rect = findRectOfMouse(highlightedNodes, mouseX, mouseY);
    await position(rect);
  }

  export function hide() {
    const tooltip = getTooltipEl();
    tooltip.style.display = "none";
    tooltip.contentWindow?.getSelection()?.empty();
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
      if (!_highlightedNodes || _repositionRequested) return;
      const range = new Range();
      range.selectNode(_highlightedNodes[0]);
      const rect = range.getClientRects()[0];
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
    nodes: Node[],
    mouseX: number,
    mouseY: number
  ): DOMRect {
    let range = new Range();
    for (const node of nodes) {
      range.selectNode(node);
      const rects = range.getClientRects();
      for (const rect of rects) {
        if (Utils.rectContainsPoint(rect, mouseX, mouseY)) {
          return rect;
        }
      }
    }

    range.selectNode(nodes[0]);
    let rects = range.getClientRects();
    return rects[0];
  }

  /** position tooltip next to rect */
  async function position(rect: DOMRect) {
    // min margin between tooltip and window
    const MARGIN = 10;
    // space between highlighted rect and tooltip
    const VERTICAL_SPACE = 6;
    const MAX_HEIGHT = 300;
    const BOTTOM_ADVANTAGE = 150;

    const tooltip = getTooltipEl();
    // reset tooltipEl style beforehand so tooltip does not affect document size.
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    tooltip.style.width = Math.min(500, window.innerWidth - 2 * MARGIN) + "px";
    tooltip.style.removeProperty("transform");

    // calculate frame size
    let tooltipWindow = tooltip.contentWindow as Window;
    let content = tooltip.contentDocument?.getElementById(
      "yomikiri-entries"
    ) as HTMLElement;
    const width = tooltipWindow.innerWidth;
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
`;
    Config.setStyle(doc);
    doc.documentElement.classList.add("yomikiri");

    _tooltipSvelte = new TooltipSvelte({
      target: doc.body,
      props: {},
    });
    _tooltipSvelte.$on("addNote", async (ev: CustomEvent<AddNoteForEntry>) => {
      const request = ev.detail;
      const markerData: MarkerData = {
        tokenized: _tokenizeResult,
        entry: request.entry,
        selectedMeaning: request.sense,
        sentence: _tokenizeResult.tokens.map((tok) => tok.text).join(""),
        url: window.location.href,
        pageTitle: document.title,
      };

      const toast = Toast.loading("Preparing Anki note");
      let note: NoteData;
      try {
        note = await AnkiNoteBuilder.buildNote(markerData);
      } catch (err) {
        toast.error(Utils.errorMessage(err));
        throw err;
      }
      toast.update("Adding note to Anki");
      try {
        await AnkiApi.addNote(note);
      } catch (err) {
        toast.error(Utils.errorMessage(err));
        throw err;
      }
      toast.success("Added note to Anki!");
    });
  }
}
