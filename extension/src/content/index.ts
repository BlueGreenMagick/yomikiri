import {
  charLocationAtPos,
  sentenceAtCharLocation,
  nodesOfToken,
} from "./scanner";
import { BrowserApi } from "~/browserApi";
import { Highlighter } from "./highlight";
import { Tooltip } from "~/content/tooltip";
import Utils from "~/utils";
import Config from "~/config";
import { Platform } from "@platform";
import { Backend } from "~/backend";
import { containsJapaneseContent } from "~/japanese";

declare global {
  interface Window {
    Api: typeof BrowserApi;
    ensureInitialized: typeof ensureInitialized;
  }
}

let _initialized: Promise<void> | undefined;

async function _initialize() {
  BrowserApi.initialize({ context: "contentScript" });
  Platform.initialize();
  await Config.initialize();
  await Backend.initialize();
  await Highlighter.initialize();
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

  const result = await Backend.tokenize({
    text: scannedSentence.text,
    charAt: scannedSentence.charAt,
  });
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
  if (result.mainEntries.length === 0) {
    Tooltip.hide();
    Highlighter.highlightRed(nodes);
  } else {
    Highlighter.highlightNodes(nodes);
    await Tooltip.show(result, nodes, x, y);
  }
  return true;
}

const trigger = Utils.SingleQueued(_trigger);

document.addEventListener("mousemove", async (ev) => {
  // inside yomikiri tooltip
  if (document.documentElement.classList.contains("yomikiri")) {
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

  if (Utils.isTouchScreen) {
    const triggered = await trigger(ev.clientX, ev.clientY);
    if (triggered === false) {
      Tooltip.hide();
      Highlighter.unhighlight();
    }
  }
});

window.Api = BrowserApi;
window.ensureInitialized = ensureInitialized;
