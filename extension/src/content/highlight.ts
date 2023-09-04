import { Tooltip } from "./tooltip";
import { Scanner } from "./scanner";
import { Platform } from "@platform";

interface IHighlighter {
  type: "selection" | "wrap";
  highlighted: boolean;
  initialize: () => void;
  highlightNodes: (nodes: Node[]) => void;
  /** For unknown tokens */
  highlightRed: (nodes: Node[]) => void;
  /** Unhighlight all */
  unhighlight: () => void;
}

namespace SelectionHighlighter {
  const STYLE_ID = "yomikiri-selection-css";

  export const type = "selection";
  export let highlighted = false;
  let hasListener = false;
  let ignoreNextSelectionEventFire = 0;

  export function initialize() {}

  /** May modify range */
  export function highlightNodes(nodes: Node[]) {
    console.log("highlight", nodes);
    _highlightNodes(nodes);
    changeSelectionColor("#a0a0a0a0");
  }

  export function highlightRed(nodes: Node[]) {
    _highlightNodes(nodes);
    changeSelectionColor("#ff2626a0");
  }

  /** Unhighlight all */
  export function unhighlight() {
    if (!highlighted) {
      return;
    }
    highlighted = false;
    let selection = document.getSelection();
    if (selection === null) return;
    selection.removeAllRanges();
    revertSelectionColor();
  }

  function _highlightNodes(nodes: Node[]) {
    let selection = window.getSelection();
    if (selection === null) return;

    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
      ignoreNextSelectionEventFire += 1;
    }
    let lastNode = nodes[nodes.length - 1];
    selection.setBaseAndExtent(
      nodes[0],
      0,
      lastNode,
      lastNode.textContent?.length ?? lastNode.childNodes.length
    );
    ignoreNextSelectionEventFire += 1;
    highlighted = true;
  }

  /** Call this.changeSelectionColor afterwards */
  function highlightRange(range: Range) {
    let selection = window.getSelection();
    if (selection === null) return;

    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
      ignoreNextSelectionEventFire += 1;
    }
    selection.addRange(range);
    ignoreNextSelectionEventFire += 1;
    highlighted = true;
  }

  function changeSelectionColor(color: string) {
    let styleEl = document.getElementById(STYLE_ID);
    if (styleEl === null) {
      styleEl = document.createElement("style");
    }
    styleEl.innerHTML = `::selection { background-color: ${color} !important; }`;
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);

    if (!hasListener) {
      const listener = () => {
        if (ignoreNextSelectionEventFire) {
          ignoreNextSelectionEventFire -= 1;
          return;
        }
        revertSelectionColor();
        Tooltip.hide();
        document.removeEventListener("selectionchange", listener);
        hasListener = false;
      };
      document.addEventListener("selectionchange", listener);
      hasListener = true;
    }
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
    style.innerHTML = HIGHLIGHT_CSS;
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
    for (const node of document.getElementsByTagName(TAG_NAME)) {
      unhighlightElement(node);
    }
    highlighted = false;
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

  function textNodesInRange(range: Range): Text[] {
    if (
      range.startContainer === range.endContainer &&
      range.startContainer instanceof Text
    ) {
      let node = range.startContainer;
      node.splitText(range.endOffset);
      node = node.splitText(range.startOffset);
      return [node];
    }

    // [startNode, endNode)
    let startContainer = range.startContainer;
    let startNode: Node;
    if (startContainer instanceof Text) {
      startNode = startContainer.splitText(range.startOffset);
    } else if (startContainer instanceof CharacterData) {
      startNode = startContainer;
    } else {
      startNode = startContainer.childNodes[range.startOffset];
    }

    let endContainer = range.endContainer;
    let endNode: Node | null;
    if (endContainer instanceof Text) {
      endNode = endContainer.splitText(range.endOffset);
    } else if (endContainer instanceof CharacterData) {
      endNode = endContainer;
    } else {
      if (range.endOffset < endContainer.childNodes.length) {
        endNode = endContainer.childNodes[range.endOffset];
      } else {
        // endNode = next node of endContainer
        let parent = endContainer;
        while (parent.nextSibling === null) {
          if (parent.parentNode === null) {
            endNode = null;
            break;
          }
          parent = parent.parentNode;
        }
        endNode = parent.nextSibling;
      }
    }
    const nodes: Text[] = [];

    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_ALL,
      (node) => {
        // TODO: move this function out of scanner
        if (Scanner.nodeIsOutOfFlow(node)) {
          return NodeFilter.FILTER_REJECT;
        } else {
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    walker.currentNode = startNode;

    let node: Node | null = startNode;
    while (node !== null) {
      if (range.comparePoint(node, 0) > 0) {
        break;
      }
      if (node instanceof Text) {
        nodes.push(node);
      }
      node = walker.nextNode();
    }
    return nodes;
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
