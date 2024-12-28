import Utils, { type Rect } from "lib/utils";
import type { TokenizeResult } from "@platform/backend";
import Config from "lib/config";
import TooltipPage from "./TooltipPage.svelte";
import { Highlighter } from "./highlight";
import { TOOLTIP_IFRAME_ID, TOOLTIP_ZINDEX } from "consts";

export class Tooltip {
  config: Config;
  highlighter: Highlighter;

  private _tooltipPageSvelte: TooltipPage | null = null;
  private _shown = false;
  private _resizeObserverAttached = false;
  private _repositionRequested = false;

  constructor(config: Config, highlighter: Highlighter) {
    this.config = config;
    this.highlighter = highlighter;
  }

  async show(
    tokenizeResult: TokenizeResult,
    highlightedRects: Rect[],
    mouseX: number,
    mouseY: number,
  ) {
    let tooltip = this.getTooltipEl();
    let tooltipPage = this._tooltipPageSvelte;
    if (tooltip === null || tooltipPage === null) {
      [tooltip, tooltipPage] = await this.createTooltipIframe();
      this._tooltipPageSvelte = tooltipPage;
    }
    tooltip.contentDocument?.scrollingElement?.scrollTo(0, 0);
    tooltip.style.display = "block";
    this._shown = true;
    tooltipPage.setTokenizeResult(tokenizeResult); // eslint-disable-line
    const rect = this.findRectOfMouse(highlightedRects, mouseX, mouseY);
    if (rect === null) {
      return;
    }
    this.position(tooltip, rect);
  }

  hide() {
    const tooltip = this.getTooltipEl();
    if (tooltip === null) {
      return;
    }
    tooltip.style.display = "none";
    tooltip.contentWindow?.getSelection()?.empty();
    this._shown = false;
  }

  private async createTooltipIframe(): Promise<
    [HTMLIFrameElement, TooltipPage]
  > {
    const iframe = document.createElement("iframe");
    iframe.id = TOOLTIP_IFRAME_ID;
    iframe.style.position = "absolute";
    iframe.style.maxWidth = "calc(min(500px, 100vw))";
    iframe.style.minWidth = "300px";
    iframe.style.backgroundColor = "white";
    iframe.style.border = "1px solid black";
    iframe.style.zIndex = `${TOOLTIP_ZINDEX}`;
    iframe.style.boxShadow = "0 0 4px rgba(0, 0, 0, 0.4)";
    iframe.style.display = "block";
    iframe.style.boxSizing = "content-box";
    document.body.appendChild(iframe);

    this.config.store("general.tooltip_max_height").subscribe((_) => {
      this.updateTooltipHeight(iframe, true);
    });

    if (!this._resizeObserverAttached) {
      this.attachResizeObserver();
      this._resizeObserverAttached = true;
    }

    const iframeDoc = iframe.contentDocument!;
    if (iframeDoc.readyState === "complete") {
      const tooltipPage = this.setupEntriesPage(iframe);
      return [iframe, tooltipPage];
    } else {
      const [promise, resolve] =
        Utils.createPromise<[HTMLIFrameElement, TooltipPage]>();
      iframe.addEventListener("load", () => {
        const tooltipPage = this.setupEntriesPage(iframe);
        resolve([iframe, tooltipPage]);
      });
      return promise;
    }
  }

  /** add ResizeObserver to document and change position on document resize */
  private attachResizeObserver() {
    const resizeObserver = new ResizeObserver((_) => {
      if (!this._shown || this._repositionRequested) return;
      this._repositionRequested = true;
      requestAnimationFrame(() => {
        this._repositionRequested = false;
        if (!this._shown) return;
        const tooltipEl = this.getTooltipEl();
        if (!tooltipEl) return;
        const rects = this.highlighter.highlightedRects();
        this.position(tooltipEl, rects[0]);
      });
    });
    resizeObserver.observe(document.documentElement);
  }

  private getTooltipEl(): HTMLIFrameElement | null {
    return document.getElementById(
      TOOLTIP_IFRAME_ID,
    ) as HTMLIFrameElement | null;
  }

  private findRectOfMouse(
    rects: Rect[],
    mouseX: number,
    mouseY: number,
  ): Rect | null {
    if (rects.length === 0) {
      return null;
    }
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
  private position(tooltip: HTMLIFrameElement, rect: Rect) {
    // min margin between tooltip and window
    const MARGIN = 10;
    // space between highlighted rect and tooltip
    const VERTICAL_SPACE = 10;
    const MAX_HEIGHT = this.config.get("general.tooltip_max_height");
    const WIDTH = Math.min(500, window.innerWidth - 2 * MARGIN);
    const BOTTOM_ADVANTAGE = 150;

    // reset tooltipEl style beforehand so tooltip does not affect document size.
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    tooltip.style.width = `${WIDTH}px`;
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

    const left = Math.min(rectLeft, rootRect.width - MARGIN - WIDTH);
    tooltip.style.left = `${left}px`;

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
      tooltip.style.top = `${rectBottom + VERTICAL_SPACE}px`;
    } else {
      tooltip.style.top = `${rectTop - VERTICAL_SPACE}px`;
      tooltip.style.transform = "translateY(-100%)";
    }

    this.updateTooltipHeight(tooltip, true);
  }

  /**
   * update tooltip height to match content height
   *
   * if `wait` is true, update height in next task
   * to wait for layout in iframe to be recalculated.
   * if false, executes synchronously.
   */
  private updateTooltipHeight(tooltip: HTMLIFrameElement, wait = false) {
    void (async () => {
      if (wait) {
        await Promise.resolve();
      }
      let height = this.config.get("general.tooltip_max_height");

      const content = tooltip.contentDocument?.body.children[0];
      if (content) {
        // getBoundingClientRect().height returns floating-precision number
        const rect = content.getBoundingClientRect();
        height = rect.height;
      }

      tooltip.style.height = `${height}px`;
    })();
  }

  private setupEntriesPage(tooltip: HTMLIFrameElement) {
    const doc = tooltip.contentDocument!;
    doc.head.textContent! += `
<meta name="viewport" content="width=device-width, initial-scale=1" />
`;
    this.config.setStyle(doc);
    doc.documentElement.classList.add("yomikiri");

    const tooltipPage = new TooltipPage({
      target: doc.body,
      props: {
        onClose: () => {
          this.hide();
          this.highlighter.unhighlight();
        },
        onUpdateHeight: () => {
          const tooltip = this.getTooltipEl();
          if (tooltip !== null) {
            this.updateTooltipHeight(tooltip);
          }
        },
      },
    });
    return tooltipPage;
  }
}
