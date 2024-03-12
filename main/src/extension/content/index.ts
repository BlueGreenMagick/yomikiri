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
import { Platform } from "@platform";
import { Backend } from "@platform/backend";
import { containsJapaneseContent } from "~/japanese";

declare global {
  interface Window {
    Api: typeof BrowserApi;
    Config: typeof Config;
    ensureInitialized: typeof ensureInitialized;
  }
}

let initialized: boolean = false;

let _initialized: Promise<void> | undefined;

async function _initialize() {
  BrowserApi.initialize({ context: "contentScript" });
  Platform.initialize();
  await Config.initialize();
  await Backend.initialize();
  await Highlighter.initialize();
  initialized = true;
}

async function ensureInitialized() {
  if (_initialized === undefined) {
    _initialized = _initialize();
  }
  return _initialized;
}

/** Return false if not triggered on japanese text */
/*
1. Get char location at (x,y)
2. If already highlighted, stop
3. Scan sentence at char location
4. Tokenize sentence
5. Get nodes of current token
6. Highlight nodes, unhighlighting previous nodes
*/
async function _trigger(x: number, y: number): Promise<boolean> {
  await ensureInitialized();

  const charLoc = await charLocationAtPos(x, y);
  if (charLoc === null) return false;

  if (Highlighter.isHighlighted(charLoc.node, charLoc.charAt)) {
    return false;
  }

  const scannedSentence = sentenceAtCharLocation(charLoc.node, charLoc.charAt);
  if (!containsJapaneseContent(scannedSentence.text)) {
    return false;
  }

  const result = await Backend.tokenize(
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
    Tooltip.hide();
    Highlighter.highlightRed(nodes);
  } else {
    Highlighter.highlightNodes(nodes);
    let rects = Highlighter.highlightedRects();
    await Tooltip.show(result, rects, x, y);
  }
  return true;
}

const trigger = Utils.SingleQueued(_trigger);

document.addEventListener("mousemove", async (ev) => {
  // inside yomikiri tooltip
  if (document.documentElement.classList.contains("yomikiri")) {
    return;
  }
  if (!Config.initialized || !Config.get("state.enabled")) {
    return;
  }

  if (ev.shiftKey) {
    await trigger(ev.clientX, ev.clientY);
  }
});

document.addEventListener("click", async (ev: MouseEvent) => {
  // inside yomikiri tooltip
  if (document.documentElement.classList.contains("yomikiri")) {
    return;
  }
  if (!Config.initialized || !Config.get("state.enabled")) {
    return;
  }

  if (Utils.isTouchScreen) {
    const triggered = await trigger(ev.clientX, ev.clientY);
    if (triggered === false) {
      Tooltip.hide();
      Highlighter.unhighlight();
    }
  }
});

function checkStateEnabled() {
  if (!initialized) return;


  const value = Config.get("state.enabled");
  if (!value) {
    Tooltip.hide();
    Highlighter.unhighlight();
  }
}

Config.onChange(checkStateEnabled)
ensureInitialized();


window.Api = BrowserApi;
window.ensureInitialized = ensureInitialized;
window.Config = Config;