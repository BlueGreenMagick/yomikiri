import Utils, { Hook, type Rect } from "@/features/utils";
import type { TokenizeResult } from "#platform/backend";
import Config from "@/features/config";
import TooltipPage from "./TooltipPage.svelte";
import { TOOLTIP_IFRAME_ID, TOOLTIP_ZINDEX } from "consts";

export class Tooltip {
  config: Config;

  visible = false;
  onCloseClicked = new Hook();

  private _tooltipPageSvelte: TooltipPage | null = null;

  constructor(config: Config) {
    this.config = config;
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
    this.visible = true;
    tooltipPage.setTokenizeResult(tokenizeResult); // eslint-disable-line
    const rect = this.findRectOfMouse(highlightedRects, mouseX, mouseY);
    if (rect === null) {
      return;
    }
    this.position(tooltip, rect);
  }

  hide() {
    if (!this.visible) return;

    const tooltip = this.getTooltipEl();
    if (tooltip === null) {
      return;
    }
    tooltip.style.display = "none";
    tooltip.contentWindow?.getSelection()?.empty();
    this.visible = false;
  }

  move(highlightedRects: Rect[]) {
    if (!this.visible) return;

    const tooltipEl = this.getTooltipEl();
    if (!tooltipEl) return;
    this.position(tooltipEl, highlightedRects[0]);
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

    // hide tooltipEl so tooltip does not affect document size.
    const prevDisplay = tooltip.style.display;
    tooltip.style.display = "none";

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
      tooltip.style.removeProperty("transform");
    } else {
      tooltip.style.top = `${rectTop - VERTICAL_SPACE}px`;
      tooltip.style.transform = "translateY(-100%)";
    }
    tooltip.style.width = `${WIDTH}px`;
    tooltip.style.display = prevDisplay;
  }

  /** update tooltip height to match content height */
  private updateTooltipHeight(tooltip: HTMLIFrameElement, height: number) {
    tooltip.style.height = `${height}px`;
  }

  private setupEntriesPage(tooltip: HTMLIFrameElement) {
    const doc = tooltip.contentDocument!;
    doc.head.textContent! += `
<meta name="viewport" content="width=device-width, initial-scale=1" />
`;
    doc.documentElement.classList.add("yomikiri");

    const initialize = async () => {
      await Promise.resolve();
      return { config: this.config };
    };

    const tooltipPage = new TooltipPage({
      target: doc.body,
      props: {
        initialize,
        onClose: () => {
          this.hide();
          this.onCloseClicked.call();
        },
        onUpdateHeight: (height: number) => {
          const tooltip = this.getTooltipEl();
          if (tooltip !== null) {
            this.updateTooltipHeight(tooltip, height);
          }
        },
      },
    });
    return tooltipPage;
  }
}
