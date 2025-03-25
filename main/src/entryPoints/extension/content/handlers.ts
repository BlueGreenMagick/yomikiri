import { highlighter, lazyTooltip } from "./shared";
import {
  charLocationAtPos,
  sentenceAtCharLocation,
  nodesOfToken,
  textNodeAtPos,
} from "./scanner";
import { SingleQueued, isTouchScreen } from "lib/utils";
import { containsJapaneseContent } from "lib/japanese";
import { Backend } from "#platform/backend";
import Config from "lib/config";

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
  const charLoc = charLocationAtPos(x, y);
  if (charLoc === null) return false;

  if (highlighter.isHighlighted(charLoc.node, charLoc.charAt)) {
    return false;
  }

  if (!containsJapaneseContent(charLoc.node.data[charLoc.charAt])) {
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
  if (!ev.shiftKey) return;

  if (
    !Config.instance.initialized &&
    !fastCheckIfTooltipMayShow(ev.clientX, ev.clientY)
  ) {
    return;
  }

  const config = await Config.instance.get();
  if (!config.get("state.enabled")) return;

  trigger(ev.clientX, ev.clientY).catch((err: unknown) => {
    throw err;
  });
}

async function handleClickInner(ev: MouseEvent) {
  if (!isTouchScreen) return;

  if (
    !Config.instance.initialized &&
    !fastCheckIfTooltipMayShow(ev.clientX, ev.clientY)
  ) {
    return;
  }

  const config = await Config.instance.get();
  if (!config.get("state.enabled")) return;

  const triggered = await trigger(ev.clientX, ev.clientY);
  if (triggered === false) {
    lazyTooltip.getIfInitialized()?.hide();
    highlighter.unhighlight();
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
