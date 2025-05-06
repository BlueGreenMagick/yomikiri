import { Platform } from "#platform";
import Config from "../config";
import { containsJapaneseContent } from "../japanese";
import { isTouchScreen, LazyAsync, SingleQueued } from "../utils";
import { Highlighter } from "./highlight";
import {
  charLocationAtPos,
  nodesOfToken,
  sentenceAtCharLocation,
  textNodeAtPos,
} from "./scanner";
import { Tooltip } from "./tooltip";

export class ContentScriptController {
  highlighter: Highlighter;
  lazyTooltip: LazyAsync<Tooltip>;
  lazyConfig: LazyAsync<Config>;

  constructor(lazyConfig: LazyAsync<Config> = Config.instance) {
    this.lazyConfig = lazyConfig;
    this.highlighter = new Highlighter();
    this.lazyTooltip = new LazyAsync(() => this.createTooltip());

    this.highlighter.onUnhighlight.listen(() => {
      this.lazyTooltip.getIfInitialized()?.hide();
    });

    this.lazyConfig.onInitialize((config) => {
      this.handleStateEnabledChange(config);
    });

    this.attachEventListeners();
  }

  private async createTooltip() {
    const config = await this.lazyConfig.get();
    const tooltip = new Tooltip(config);

    tooltip.onCloseClicked.listen(() => {
      this.highlighter.unhighlight();
    });

    // add ResizeObserver to document and change position on document resize
    let repositionRequested = false;
    const resizeObserver = new ResizeObserver((_) => {
      if (!tooltip.visible || repositionRequested) return;
      repositionRequested = true;

      requestAnimationFrame(() => {
        repositionRequested = false;
        const rects = this.highlighter.highlightedRects();
        tooltip.move(rects);
      });
    });
    resizeObserver.observe(document.documentElement);

    return tooltip;
  }

  private handleStateEnabledChange(config: Config) {
    const enabledState = config.store("state.enabled");
    enabledState.subscribe((enabled) => {
      if (!enabled) {
        this.lazyTooltip.getIfInitialized()?.hide();
        this.highlighter.unhighlight();
      }
    });
  }

  private attachEventListeners() {
    document.addEventListener("mousemove", (ev) => {
      void this.handleMouseMove(ev);
    });
    document.addEventListener("click", (ev) => {
      void this.handleClick(ev);
    });
  }

  private async handleMouseMove(ev: MouseEvent) {
    if (!ev.shiftKey) return;

    if (
      !this.lazyConfig.initialized &&
      !fastCheckIfTooltipMayShow(ev.clientX, ev.clientY)
    ) {
      return;
    }

    const config = await this.lazyConfig.get();
    if (!config.get("state.enabled")) return;

    this.trigger(ev.clientX, ev.clientY).catch((err: unknown) => {
      throw err;
    });
  }

  private async handleClick(ev: MouseEvent) {
    if (!isTouchScreen) return;

    if (
      !this.lazyConfig.initialized &&
      !fastCheckIfTooltipMayShow(ev.clientX, ev.clientY)
    ) {
      return;
    }

    const config = await this.lazyConfig.get();
    if (!config.get("state.enabled")) return;

    const triggered = await this.trigger(ev.clientX, ev.clientY);
    if (triggered === false) {
      this.lazyTooltip.getIfInitialized()?.hide();
      this.highlighter.unhighlight();
    }
  }

  readonly trigger = SingleQueued(this._trigger.bind(this));

  private async _trigger(x: number, y: number): Promise<boolean> {
    const charLoc = charLocationAtPos(x, y);
    if (charLoc === null) return false;

    if (this.highlighter.isHighlighted(charLoc.node, charLoc.charAt)) {
      return false;
    }

    if (!containsJapaneseContent(charLoc.node.data[charLoc.charAt])) {
      return false;
    }

    const scannedSentence = sentenceAtCharLocation(
      charLoc.node,
      charLoc.charAt,
    );
    if (!containsJapaneseContent(scannedSentence.text)) {
      return false;
    }

    const result = await Platform.backend.tokenize({
      text: scannedSentence.text,
      charAt: scannedSentence.charAt,
    });
    const currToken = result.tokens[result.tokenIdx];

    const nodes = nodesOfToken(
      charLoc.node,
      charLoc.charAt,
      currToken.text.length,
      scannedSentence.charAt - currToken.start,
    );
    if (result.entries.length === 0) {
      this.lazyTooltip.getIfInitialized()?.hide();
      this.highlighter.highlightRed(nodes);
    } else {
      this.highlighter.highlightNodes(nodes);
      const rects = this.highlighter.highlightedRects();
      const tooltip = await this.lazyTooltip.get();
      await tooltip.show(result, rects, x, y);
    }
    return true;
  }
}

/**
 * Rough check for whether tooltip may show.
 *
 * Used to avoid triggering code when:
 * 1) ad iframes
 * 2) user event that won't trigger tooltip
 * 3) non-japanese websites
 *
 * It is ok to be slightly inaccurate for first event
 * when it is not certain that this add-on is relevant
 */
function fastCheckIfTooltipMayShow(x: number, y: number): boolean {
  const node = textNodeAtPos(x, y);
  if (node === null) return false;
  return containsJapaneseContent(node.data);
}
