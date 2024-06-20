import {
  charLocationAtPos,
  sentenceAtCharLocation,
  nodesOfToken,
} from "./scanner";
import { BrowserApi } from "extension/browserApi";
import { Highlighter } from "./highlight";
import { Tooltip } from "extension/content/tooltip";
import Utils, { LazyAsync, exposeGlobals } from "lib/utils";
import Config from "lib/config";
import { Platform, type ExtensionPlatform } from "@platform";
import { containsJapaneseContent } from "lib/japanese";

const browserApi = new BrowserApi({ context: "contentScript" });
const platform = new Platform(browserApi) as ExtensionPlatform;
const lazyBackend = new Utils.Lazy(async () => await platform.newBackend());
const lazyConfig = new Utils.LazyAsync(async () => {
  const config = await Config.initialize(platform);
  handleStateEnabledChange(config);
  return config;
});
const lazyAnkiApi = new LazyAsync(async () =>
  platform.newAnkiApi(await lazyConfig.get()),
);
const highlighter = new Highlighter(() => {
  lazyTooltip.getIfInitialized()?.hide();
});
const lazyTooltip = new Utils.LazyAsync(
  async () =>
    new Tooltip(
      platform,
      await lazyConfig.get(),
      await lazyAnkiApi.get(),
      highlighter,
    ),
);

declare global {
  interface Window {
    alreadyExecuted?: true;
  }
}

maybeInitialize();

function maybeInitialize() {
  // yomikiri tooltip iframe
  if (document.documentElement.classList.contains("yomikiri")) {
    return;
  }

  // Do not re-execute content script
  // when browser.runtime.reload() is called
  if (window.alreadyExecuted) return;
  window.alreadyExecuted = true;

  initialize();
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
    scannedSentence.charAt - currToken.start,
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

async function onMouseMoveInner(ev: MouseEvent) {
  const config = await lazyConfig.get();
  if (!config.get("state.enabled")) return;

  if (ev.shiftKey) {
    trigger(ev.clientX, ev.clientY).catch((err: unknown) => {
      throw err;
    });
  }
}

function onMouseMove(ev: MouseEvent) {
  void onMouseMoveInner(ev);
}

async function onClickInner(ev: MouseEvent) {
  const config = await lazyConfig.get();
  if (!config.get("state.enabled")) return;

  if (Utils.isTouchScreen) {
    const triggered = await trigger(ev.clientX, ev.clientY);
    if (triggered === false) {
      lazyTooltip.getIfInitialized()?.hide();
      highlighter.unhighlight();
    }
  }
}

function onClick(ev: MouseEvent) {
  void onClickInner(ev);
}

function handleStateEnabledChange(config: Config) {
  const enabledState = config.store("state.enabled");
  enabledState.subscribe((enabled) => {
    if (!enabled) {
      lazyTooltip.getIfInitialized()?.hide();
      highlighter.unhighlight();
    }
  });
}

function initialize() {
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("click", onClick);

  exposeGlobals({
    platform,
    browserApi,
    Utils,
    backend: () => {
      return lazyBackend.get();
    },
    config: () => {
      void lazyConfig.get();
      return lazyConfig.getIfInitialized();
    },
    highlighter,
    tooltip: () => {
      void lazyTooltip.get();
      return lazyTooltip.getIfInitialized();
    },
  });
}
