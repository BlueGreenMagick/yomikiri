import { highlighter, lazyBackend, lazyConfig, lazyTooltip } from "./shared";
import {
  charLocationAtPos,
  sentenceAtCharLocation,
  nodesOfToken,
} from "./scanner";
import { SingleQueued, isTouchScreen } from "lib/utils";
import { containsJapaneseContent } from "lib/japanese";

export function handleMouseMove(ev: MouseEvent) {
  void handleMouseMoveInner(ev);
}

export function handleClick(ev: MouseEvent) {
  void handleClickInner(ev);
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

const trigger = SingleQueued(_trigger);

async function handleMouseMoveInner(ev: MouseEvent) {
  const config = await lazyConfig.get();
  if (!config.get("state.enabled")) return;

  if (ev.shiftKey) {
    trigger(ev.clientX, ev.clientY).catch((err: unknown) => {
      throw err;
    });
  }
}

async function handleClickInner(ev: MouseEvent) {
  const config = await lazyConfig.get();
  if (!config.get("state.enabled")) return;

  if (isTouchScreen) {
    const triggered = await trigger(ev.clientX, ev.clientY);
    if (triggered === false) {
      lazyTooltip.getIfInitialized()?.hide();
      highlighter.unhighlight();
    }
  }
}
