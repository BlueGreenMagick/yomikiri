import {
  charLocationAtPos,
  sentenceAtCharLocation,
  nodesOfToken,
} from "./scanner";
import { BrowserApi } from "~/extension/browserApi";
import { Highlighter } from "./highlight";
import { Tooltip } from "~/extension/content/tooltip";
import Utils from "~/utils";
import Config from "~/config";
import { Platform } from "@platform-ext";
import { containsJapaneseContent } from "~/japanese";

declare global {
  interface Window {
    Api: typeof BrowserApi;
    Config: typeof Config;
  }
}

const browserApi = new BrowserApi({ context: "contentScript" });
const platform = new Platform(browserApi)
const lazyBackend = new Utils.Lazy(async () => await platform.newBackend())
const lazyConfig = new Utils.LazyAsync(() => Config.initialize(platform))
const highlighter = new Highlighter(() => { lazyTooltip.getIfInitialized()?.hide() })
const lazyTooltip = new Utils.LazyAsync(async () => new Tooltip(platform, await lazyConfig.get(), highlighter))

const _initialized = initialize()

async function initialize() {
  const config = await lazyConfig.get();
  config.onChange(() => { checkStateEnabled(config) });
  document.addEventListener("mousemove", (ev) => { onMouseMove(ev, config) })
  document.addEventListener("click", (ev) => { onClick(ev, config) })
}

/** Return false if not triggered on Japanese text */
/*
1. Get char location at (x,y)
2. If already highlighted, stop
3. Scan sentence at char location
4. Tokenize sentence
5. Get nodes of current token
6. Highlight nodes, unhighlighting previous nodes
*/
async function _trigger(x: number, y: number): Promise<boolean> {
  const backend = await lazyBackend.get();

  const charLoc = charLocationAtPos(x, y);
  if (charLoc === null) return false;

  if (highlighter.isHighlighted(charLoc.node, charLoc.charAt)) {
    return false;
  }

  const scannedSentence = sentenceAtCharLocation(charLoc.node, charLoc.charAt);
  if (!containsJapaneseContent(scannedSentence.text)) {
    return false;
  }

  const result = await backend.tokenize(
    scannedSentence.text,
    scannedSentence.charAt,
  );
  const currToken = result.tokens[result.tokenIdx];
  if (!containsJapaneseContent(currToken.text)) {
    return false;
  }

  const nodes = nodesOfToken(
    charLoc.node,
    charLoc.charAt,
    currToken.text.length,
    scannedSentence.charAt - currToken.start
  );
  if (result.entries.length === 0) {
    lazyTooltip.getIfInitialized()?.hide();
    highlighter.highlightRed(nodes);
  } else {
    highlighter.highlightNodes(nodes);
    const rects = highlighter.highlightedRects();
    const tooltip = await lazyTooltip.get();
    await tooltip.show(result, rects, x, y);
  }
  return true;
}

const trigger = Utils.SingleQueued(_trigger);

function onMouseMove(ev: MouseEvent, config: Config) {
  // inside yomikiri tooltip
  if (document.documentElement.classList.contains("yomikiri")) {
    return;
  }
  if (!config.initialized || !config.get("state.enabled")) {
    return;
  }

  if (ev.shiftKey) {
    trigger(ev.clientX, ev.clientY)
  }
}

function onClick(ev: MouseEvent, config: Config) {
  // inside yomikiri tooltip
  if (document.documentElement.classList.contains("yomikiri")) {
    return;
  }
  if (!config.initialized || !config.get("state.enabled")) {
    return;
  }

  if (Utils.isTouchScreen) {
    trigger(ev.clientX, ev.clientY).then((triggered) => {
      if (triggered === false) {
        lazyTooltip.getIfInitialized()?.hide();
        highlighter.unhighlight();
      }
    })
  }
}

function checkStateEnabled(config: Config) {
  const value = config.get("state.enabled");
  if (!value) {
    lazyTooltip.getIfInitialized()?.hide();
    highlighter.unhighlight();
  }
}



window.Api = BrowserApi;
window.Config = Config;