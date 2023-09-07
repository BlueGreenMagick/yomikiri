import { Scanner } from "./scanner";
import { Api } from "~/api";
import { Highlighter } from "./highlight";
import { Tooltip } from "~/content/tooltip";
import Utils from "~/utils";
import Config from "~/config";
import { Platform } from "@platform";
import { Backend } from "~/backend";
import { containsJapaneseContent } from "~/japanese";

declare global {
  interface Window {
    Scanner: typeof Scanner;
    Api: typeof Api;
    ensureInitialized: typeof ensureInitialized;
  }
}

let _initialized: Promise<void> | undefined;

async function _initialize() {
  Api.initialize({ context: "contentScript" });
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

  const charLoc = await Scanner.charLocationAtPos(x, y);
  if (charLoc === null) return false;

  if (Highlighter.isHighlighted(charLoc.node, charLoc.charAt)) {
    return false;
  }

  const scanned = Scanner.sentenceAtCharLocation(charLoc.node, charLoc.charAt);
  if (!containsJapaneseContent(scanned.text)) {
    return false;
  }

  const result = await Backend.tokenize({
    text: scanned.text,
    charAt: scanned.charAt,
  });
  const currToken = result.tokens[result.tokenIdx];
  if (!containsJapaneseContent(currToken.text)) {
    return false;
  }

  const nodes = Scanner.nodesOfToken(
    charLoc.node,
    charLoc.charAt,
    scanned.charAt,
    currToken.text,
    currToken.start
  );
  if (result.entries.length === 0) {
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

  if (Api.isTouchScreen) {
    const triggered = await trigger(ev.clientX, ev.clientY);
    if (triggered === false) {
      Tooltip.hide();
      Highlighter.unhighlight();
    }
  }
});

window.Scanner = Scanner;
window.Api = Api;
window.ensureInitialized = ensureInitialized;
