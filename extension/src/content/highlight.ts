/**
 * Highlights range using Selection API
 */

import Platform from "@platform";

const selectionStyleElemId = "yomikiri-selection-css";
let ignoreNextSelectionEventFire = 0;

const TAG_NAME = "yomikirihl";

const HIGHLIGHT_CSS = `${TAG_NAME} {
  display: inline;
  background-color: lightgray !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
}`;

export class Highlighter {
  static useSelection(): boolean {
    return Platform.IS_DESKTOP;
  }

  constructor() {
    if (!Highlighter.useSelection()) {
      const style = document.createElement("style");
      style.innerHTML = HIGHLIGHT_CSS;
      document.head.appendChild(style);
    }
  }

  /** May modify range */
  highlightRange(range: Range) {
    if (Highlighter.useSelection()) {
      this.selHighlightRange(range);
    } else {
      this.elemHighlightRange(range);
    }
  }

  selHighlightRange(range: Range) {
    let selection = window.getSelection();
    if (selection === null) return;
    ignoreNextSelectionEventFire += 2;
    selection.removeAllRanges();
    selection.addRange(range);
    changeSelectionColor();
  }

  elemHighlightRange(range: Range) {
    const existing = [...document.getElementsByTagName(TAG_NAME)];
    if (existing.length != 0 && range.intersectsNode(existing[0])) {
      return;
    }
    const nodes = textNodesInRange(range);
    const hls: Element[] = [];
    for (const node of nodes) {
      hls.push(highlightNode(node));
    }
    range.setStartBefore(hls[0]);
    range.setStartBefore(hls[hls.length - 1]);
    for (const node of existing) {
      unhighlightElement(node);
    }
  }
}

function textNodesInRange(range: Range): Text[] {
  if (range.startContainer === range.endContainer) {
    let node = range.startContainer;
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
      endNode = endContainer.nextSibling;
    }
  }
  const nodes = [startNode];

  const walker = document.createTreeWalker(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ALL
  );
  walker.currentNode = startNode;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node === endNode) {
      break;
    }
    if (node instanceof Text) {
      nodes.push(node);
    }
  }
  return nodes as Text[];
}

function highlightNode(node: Node): Element {
  const parent = node.parentNode as Node;
  const hl = document.createElement(TAG_NAME);
  parent.insertBefore(hl, node);
  hl.appendChild(node);
  return hl;
}

function unhighlightElement(elem: Element) {
  const parent = elem.parentNode;
  elem.replaceWith(...elem.childNodes);
  parent?.normalize();
}

function changeSelectionColor() {
  if (document.getElementById(selectionStyleElemId)) return;

  const styleEl = document.createElement("style");
  styleEl.innerHTML = "::selection { background-color: lightgray }";
  styleEl.id = selectionStyleElemId;
  document.head.appendChild(styleEl);

  const listener = () => {
    if (ignoreNextSelectionEventFire) {
      ignoreNextSelectionEventFire -= 1;
      return;
    }
    revertSelectionColor();
    document.removeEventListener("selectionchange", listener);
  };
  document.addEventListener("selectionchange", listener);
}

function revertSelectionColor() {
  const elem = document.getElementById(selectionStyleElemId);
  if (elem !== null) {
    elem.parentElement?.removeChild(elem);
  }
}
