import Utils from "utils";
import {
  AnkiNoteBuilder,
  type LoadingNoteData,
  type MarkerData,
  type NoteData,
} from "~/ankiNoteBuilder";
import { Toast } from "~/toast";
import type { TokenizeResult } from "~/backend";
import type { SelectedEntryForAnki } from "~/components/DicEntryView.svelte";
import Config from "~/config";
import { AnkiApi } from "@platform/anki";
import TooltipPage from "./TooltipPage.svelte";

export namespace Tooltip {
  let _tokenizeResult: TokenizeResult;
  let _highlightedNodes: Node[];
  let _tooltipEl: HTMLIFrameElement | undefined = undefined;
  let _tooltipPageSvelte: TooltipPage;

  export async function show(
    tokenizeResult: TokenizeResult,
    highlightedNodes: Node[],
    mouseX: number,
    mouseY: number
  ) {
    let tooltip = _tooltipEl;
    if (tooltip === undefined) {
      tooltip = await createTooltipIframe();
    }
    _tokenizeResult = tokenizeResult;
    _highlightedNodes = highlightedNodes;
    tooltip.contentDocument?.scrollingElement?.scrollTo(0, 0);
    tooltip.style.display = "block";
    _tooltipPageSvelte.showEntries(_tokenizeResult.mainEntries);
    // fix bug where tooltip height is previous entry's height
    await 0;
    const rect = findRectOfMouse(highlightedNodes, mouseX, mouseY);
    await position(tooltip, rect);
  }

  export function hide() {
    const tooltip = getTooltipEl();
    if (tooltip === undefined) {
      return;
    }
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

    attachResizeObserver(_tooltipEl);

    const iframeDoc = iframe.contentDocument as Document;
    if (iframeDoc.readyState === "complete") {
      setupEntriesPage(iframe);
      return iframe;
    } else {
      const [promise, resolve] = Utils.createPromise<HTMLIFrameElement>();
      iframe.addEventListener("load", () => {
        setupEntriesPage(iframe);
        resolve(iframe);
      });
      return promise;
    }
  }

  let _repositionRequested: boolean = false;
  /** add ResizeObserver to document and change position on document resize */
  function attachResizeObserver(tooltipEl: HTMLIFrameElement) {
    const resizeObserver = new ResizeObserver((_) => {
      if (!_highlightedNodes || _repositionRequested) return;
      const range = new Range();
      range.selectNode(_highlightedNodes[0]);
      const rect = range.getClientRects()[0];
      _repositionRequested = true;
      requestAnimationFrame(() => {
        position(tooltipEl, rect);
        _repositionRequested = false;
      });
    });
    resizeObserver.observe(document.documentElement);
  }

  function getTooltipEl(): HTMLIFrameElement | undefined {
    return _tooltipEl;
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

  /**
   * position tooltip next to rect.
   *
   * 1) Horizontal position
   *  ideally tooltip.left = rect.left,
   *  but if tooltip.left + WIDTH > window.right - MARGIN
   *  tooltip.left = window.right - MARGIN - width
   *
   * 2) Vertical position
   *  prefer tooltip.top = rect.bottom + VERTICAL_SPACE,
   *  but sometimes tooltip.bottom = rect.top - VERTICAL_SPACE
   */
  async function position(tooltip: HTMLIFrameElement, rect: DOMRect) {
    // min margin between tooltip and window
    const MARGIN = 10;
    // space between highlighted rect and tooltip
    const VERTICAL_SPACE = 6;
    const MAX_HEIGHT = 300;
    const WIDTH = Math.min(500, window.innerWidth - 2 * MARGIN);
    const BOTTOM_ADVANTAGE = 150;

    // reset tooltipEl style beforehand so tooltip does not affect document size.
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    tooltip.style.width = WIDTH + "px";
    tooltip.style.height = "0px";
    tooltip.style.removeProperty("transform");

    // calculate frame position
    const rootRect = document.documentElement.getBoundingClientRect();
    const rectLeft = rect.left - rootRect.left;
    const rectTop = rect.top - rootRect.top;
    const rectBottom = rectTop + rect.height;
    const spaceTop = rect.top;
    // window.bottom - rect.bottom
    const spaceBottom = window.innerHeight - rect.bottom;
    const requiredVerticalSpace = MAX_HEIGHT + VERTICAL_SPACE + MARGIN;

    tooltip.style.left =
      Math.min(rectLeft, rootRect.width - MARGIN - WIDTH) + "px";

    // default to below text, but above text if space is too small
    let atBottom = true;

    if (spaceTop > requiredVerticalSpace) {
      if (
        spaceBottom <= requiredVerticalSpace ||
        spaceTop >= spaceBottom + BOTTOM_ADVANTAGE
      ) {
        // 1) enough screen space for top but not bottom
        // 2) bigger (and enough) screen space for top than bottom
        atBottom = false;
      }
    } else if (spaceBottom <= requiredVerticalSpace) {
      // not enough screen space for both top and bottom
      if (
        rectTop > requiredVerticalSpace &&
        rootRect.height - rectBottom <= requiredVerticalSpace
      ) {
        // enough document space for top but not bottom
        atBottom = false;
      }
    }

    if (atBottom) {
      tooltip.style.top = rectBottom + VERTICAL_SPACE + "px";
    } else {
      tooltip.style.top = rectTop - VERTICAL_SPACE + "px";
      tooltip.style.transform = "translateY(-100%)";
    }

    updateTooltipHeight(tooltip);
  }

  /** update tooltip height to match content height */
  function updateTooltipHeight(
    tooltip: HTMLIFrameElement,
    max: boolean = false
  ) {
    let height: number;

    if (max) {
      height = 300; // MAX_HEIGHT
    } else {
      let content = tooltip.contentDocument?.getElementById(
        "main"
      ) as HTMLElement;
      // getBoundingClientRect().height returns floating-precision number
      let rect = content.getBoundingClientRect();
      height = rect.height;
    }
    tooltip.style.height = height + "px";
  }

  function setupEntriesPage(tooltip: HTMLIFrameElement) {
    const doc = tooltip.contentDocument as Document;
    doc.head.innerHTML += `
<meta name="viewport" content="width=device-width, initial-scale=1" />
`;
    Config.setStyle(doc);
    doc.documentElement.classList.add("yomikiri");

    _tooltipPageSvelte = new TooltipPage({
      target: doc.body,
      props: {},
    });
    _tooltipPageSvelte.$on(
      "selectedEntryForAnki",
      async (ev: CustomEvent<SelectedEntryForAnki>) => {
        const request = ev.detail;
        const markerData: MarkerData = {
          tokenized: _tokenizeResult,
          entry: request.entry,
          selectedMeaning: request.sense,
          sentence: _tokenizeResult.tokens.map((tok) => tok.text).join(""),
          url: window.location.href,
          pageTitle: document.title,
        };

        let note: LoadingNoteData;
        try {
          note = await AnkiNoteBuilder.buildNote(markerData);
        } catch (err) {
          Toast.error(Utils.errorMessage(err));
          throw err;
        }
        _tooltipPageSvelte.showPreview(request.entry, note);
        updateTooltipHeight(tooltip, true);
      }
    );

    _tooltipPageSvelte.$on("addNote", async (ev: CustomEvent<NoteData>) => {
      const note = ev.detail;
      try {
        await AnkiApi.addNote(note);
      } catch (err) {
        throw err;
      }
    });

    _tooltipPageSvelte.$on("updateHeight", (ev: CustomEvent<void>) => {
      updateTooltipHeight(tooltip);
    });
  }
}
