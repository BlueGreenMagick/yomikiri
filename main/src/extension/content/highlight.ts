import type { Rect } from "~/utils";
import { Tooltip } from "./tooltip";
import { Platform } from "@platform";
import Utils from "~/utils";

interface IHighlighter {
  type: "selection" | "wrap";
  highlighted: boolean;
  initialize: () => void;
  highlightNodes: (nodes: Node[]) => void;
  /** For unknown tokens */
  highlightRed: (nodes: Node[]) => void;
  /** Unhighlight all */
  unhighlight: () => void;
  isHighlighted: (node: Text, charIdx?: number) => boolean;
  highlightedRects: () => Rect[];
}

namespace SelectionHighlighter {
  interface SelectionData {
    anchorNode: Node;
    anchorOffset: number;
    focusNode: Node;
    focusOffset: number;
  }

  const STYLE_ID = "yomikiri-selection-css";

  export const type = "selection";
  export let highlighted = false;
  let ignoreNextSelectionEventFire = 0;
  let selectionData: SelectionData | null = null;

  export function initialize() {
    document.addEventListener("selectionchange", (ev) => {
      if (!highlighted) {
        return;
      }
      if (ignoreNextSelectionEventFire) {
        ignoreNextSelectionEventFire -= 1;
        return;
      }

      // Check if selection has not been changed
      // Firefox emit selectionchange events when Text nodes are normalized
      // which cannot be caught by ignoreNextSelectionEventFire
      const selection = document.getSelection();
      if (
        selection !== null &&
        selectionData !== null &&
        selection.anchorNode === selectionData.anchorNode &&
        selection.anchorOffset === selectionData.anchorOffset &&
        selectionData.focusNode === selection.focusNode &&
        selectionData.focusOffset === selection.focusOffset
      ) {
        return;
      }

      revertSelectionColor();
      highlighted = false;
      Tooltip.hide();
    });
  }

  /** May modify range */
  export function highlightNodes(nodes: Node[]) {
    Utils.log("highlight", nodes);
    _highlightNodes(nodes);
    changeSelectionColor("#a0a0a0a0");
  }

  export function highlightRed(nodes: Node[]) {
    _highlightNodes(nodes);
    changeSelectionColor("#ff2626a0");
  }

  export function isHighlighted(node: Text, charIdx = 0): boolean {
    if (!highlighted) return false;
    const selection = document.getSelection();
    if (selection === null) {
      highlighted = false;
      return false;
    }
    if (selection.rangeCount === 0) {
      highlighted = false;
      return false;
    }

    const range = selection.getRangeAt(0);
    return (
      range.comparePoint(node, charIdx) === 0 &&
      // if charIdx is the char right after range, comparePoint(charIdx) is also 0
      (node.data.length == charIdx + 1 ||
        range.comparePoint(node, charIdx + 1) === 0)
    );
  }

  /** Unhighlight all */
  export function unhighlight() {
    if (!highlighted) {
      return;
    }
    highlighted = false;
    const selection = document.getSelection();
    if (selection === null) return;
    selection.removeAllRanges();
    revertSelectionColor();
  }

  export function highlightedRects(): Rect[] {
    const selection = window.getSelection();
    if (selection === null) return [];

    return [...selection.getRangeAt(0).getClientRects()];
  }

  function _highlightNodes(nodes: Node[]) {
    const selection = window.getSelection();
    if (selection === null) return;

    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
      ignoreNextSelectionEventFire += 1;
    }
    const lastNode = nodes[nodes.length - 1];
    selection.setBaseAndExtent(
      nodes[0],
      0,
      lastNode,
      lastNode.textContent?.length ?? lastNode.childNodes.length
    );
    ignoreNextSelectionEventFire += 1;
    if (selection.anchorNode === null || selection.focusNode === null) {
      return;
    }
    highlighted = true;
    nodes[0].parentNode?.normalize();
    lastNode.parentNode?.normalize();
    selectionData = {
      anchorNode: selection.anchorNode,
      anchorOffset: selection.anchorOffset,
      focusNode: selection.focusNode,
      focusOffset: selection.focusOffset,
    };
  }

  function changeSelectionColor(color: string) {
    let styleEl = document.getElementById(STYLE_ID);
    if (styleEl === null) {
      styleEl = document.createElement("style");
    }
    styleEl.textContent = `::selection { background-color: ${color} !important; }`;
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  function revertSelectionColor() {
    const elem = document.getElementById(STYLE_ID);
    if (elem !== null) {
      elem.parentElement?.removeChild(elem);
    }
  }
}

namespace WrapHighlighter {
  const TAG_NAME = "yomikirihl";
  const HIGHLIGHT_CSS = `${TAG_NAME} {
  display: inline;
  background-color: #a0a0a0a0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
}

${TAG_NAME}.unknown {
  background-color: #ff2626a0 !important;
}
`;

  export const type = "wrap";
  export let highlighted = false;

  /** Adds <style> to document head */
  export function initialize() {
    const style = document.createElement("style");
    style.textContent = HIGHLIGHT_CSS;
    document.head.appendChild(style);
  }

  /** May modify range */
  export function highlightNodes(nodes: Node[]) {
    _highlightNodes(nodes, false);
  }

  export function highlightRed(nodes: Node[]) {
    _highlightNodes(nodes, true);
  }

  /** Unhighlight all */
  export function unhighlight() {
    for (const node of [...document.getElementsByTagName(TAG_NAME)]) {
      unhighlightElement(node);
    }
    highlighted = false;
  }

  export function isHighlighted(node: Text, charIdx = 0): boolean {
    if (!highlighted) return false;
    const parent = node.parentElement;
    if (parent === null) return false;
    return parent.tagName === TAG_NAME.toUpperCase();
  }

  export function highlightedRects(): Rect[] {
    const nodes = document.getElementsByTagName(TAG_NAME);
    const rects: Rect[] = [];
    for (const node of nodes) {
      const nodeRects = [...node.getClientRects()];
      // Join neighboring rects if part of a bigger rect
      if (rects.length != 0 && nodeRects.length != 0) {
        const lastRect = rects[rects.length - 1];
        const firstNodeRect = nodeRects[0];
        if (
          lastRect.top == firstNodeRect.top &&
          lastRect.bottom == firstNodeRect.bottom &&
          lastRect.right == firstNodeRect.left
        ) {
          rects[rects.length - 1] = {
            top: lastRect.top,
            bottom: lastRect.bottom,
            left: lastRect.left,
            right: firstNodeRect.right,
          };
          nodeRects.shift();
        }
      }
      for (const nodeRect of nodeRects) {
        rects.push(nodeRect);
      }
    }

    return rects;
  }

  function _highlightNodes(nodes: Node[], unknown: boolean) {
    const existing = [...document.getElementsByTagName(TAG_NAME)];
    for (const node of nodes) {
      highlightNode(node, unknown);
    }
    for (const node of existing) {
      unhighlightElement(node);
    }
    highlighted = true;
  }

  function highlightNode(node: Node, unknown: boolean): Element {
    const parent = node.parentNode as Node;
    const hl = document.createElement(TAG_NAME);
    if (unknown) {
      hl.classList.add("unknown");
    }
    parent.insertBefore(hl, node);
    hl.appendChild(node);
    return hl;
  }

  function unhighlightElement(elem: Element) {
    const parent = elem.parentNode;
    elem.replaceWith(...elem.childNodes);
    parent?.normalize();
  }
}

SelectionHighlighter satisfies IHighlighter;
WrapHighlighter satisfies IHighlighter;

function getHighlighter(): IHighlighter {
  if (Platform.IS_DESKTOP) {
    return SelectionHighlighter;
  } else {
    return WrapHighlighter;
  }
}

export const Highlighter = getHighlighter();
