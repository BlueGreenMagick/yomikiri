import Utils, { type Rect } from "utils";
import type { TokenizeResult } from "@platform/backend";
import Config from "~/config";
import TooltipPage from "./TooltipPage.svelte";
import { Highlighter } from "./highlight";

export namespace Tooltip {
  const TOOLTIP_IFRAME_ID = "yomikiri-addon-dictionary-tooltip";
  let _tooltipPageSvelte: TooltipPage;
  let _shown = false;
  let _resizeObserverAttached = false;

  export async function show(
    tokenizeResult: TokenizeResult,
    highlightedRects: Rect[],
    mouseX: number,
    mouseY: number
  ) {
    let tooltip = getTooltipEl();
    if (tooltip === null) {
      tooltip = await createTooltipIframe();
    }
    tooltip.contentDocument?.scrollingElement?.scrollTo(0, 0);
    tooltip.style.display = "block";
    _shown = true;
    _tooltipPageSvelte.setTokenizeResult(tokenizeResult);
    // fix bug where tooltip height is previous entry's height
    await 0;
    const rect = findRectOfMouse(highlightedRects, mouseX, mouseY);
    await position(tooltip, rect);
  }

  export function hide() {
    const tooltip = getTooltipEl();
    if (tooltip === null) {
      return;
    }
    tooltip.style.display = "none";
    tooltip.contentWindow?.getSelection()?.empty();
    _shown = false;
  }

  async function createTooltipIframe(): Promise<HTMLIFrameElement> {
    const iframe = document.createElement("iframe");
    iframe.id = TOOLTIP_IFRAME_ID;
    iframe.style.position = "absolute";
    iframe.style.maxWidth = "calc(min(500px, 100vw))";
    iframe.style.minWidth = "300px";
    iframe.style.maxHeight = "300px";
    iframe.style.backgroundColor = "white";
    iframe.style.border = "1px solid black";
    iframe.style.zIndex = "2147483647";
    iframe.style.boxShadow = "0 0 4px rgba(0, 0, 0, 0.4)";
    iframe.style.display = "block";
    iframe.style.boxSizing = "content-box";
    document.body.appendChild(iframe);

    if (!_resizeObserverAttached) {
      attachResizeObserver();
      _resizeObserverAttached = true;
    }

    const iframeDoc = iframe.contentDocument!;
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

  let _repositionRequested = false;
  /** add ResizeObserver to document and change position on document resize */
  function attachResizeObserver() {
    const resizeObserver = new ResizeObserver((_) => {
      if (!_shown || _repositionRequested) return;
      _repositionRequested = true;
      requestAnimationFrame(() => {
        _repositionRequested = false;
        if (!_shown) return;
        const tooltipEl = getTooltipEl();
        if (!tooltipEl) return;
        const rects = Highlighter.highlightedRects();
        position(tooltipEl, rects[0]);
      });
    });
    resizeObserver.observe(document.documentElement);
  }

  function getTooltipEl(): HTMLIFrameElement | null {
    return document.getElementById(
      TOOLTIP_IFRAME_ID
    ) as HTMLIFrameElement | null;
  }

  function findRectOfMouse(
    rects: Rect[],
    mouseX: number,
    mouseY: number
  ): Rect {
    for (const rect of rects) {
      if (Utils.rectContainsPoint(rect, mouseX, mouseY)) {
        return rect;
      }
    }
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
  async function position(tooltip: HTMLIFrameElement, rect: Rect) {
    // min margin between tooltip and window
    const MARGIN = 10;
    // space between highlighted rect and tooltip
    const VERTICAL_SPACE = 10;
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
    const rectBottom = rect.bottom - rootRect.top;
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
    max = false
  ) {
    let height: number;

    if (max) {
      height = 300; // MAX_HEIGHT
    } else {
      const content = tooltip.contentDocument?.getElementById(
        "main"
      )!;
      // getBoundingClientRect().height returns floating-precision number
      const rect = content.getBoundingClientRect();
      height = rect.height;
    }
    tooltip.style.height = height + "px";
  }

  function setupEntriesPage(tooltip: HTMLIFrameElement) {
    const doc = tooltip.contentDocument!;
    doc.head.textContent += `
<meta name="viewport" content="width=device-width, initial-scale=1" />
`;
    Config.setStyle(doc);
    doc.documentElement.classList.add("yomikiri");

    _tooltipPageSvelte = new TooltipPage({
      target: doc.body,
      props: {},
    });

    _tooltipPageSvelte.$on("updateHeight", (ev: CustomEvent<void>) => {
      const tooltip = getTooltipEl();
      if (tooltip !== null) {
        updateTooltipHeight(tooltip);
      }
    });
  }
}
