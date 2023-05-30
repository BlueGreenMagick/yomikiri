import type { IHighlighter, IHighlighterStatic } from "../types/highlight";

const TAG_NAME = "yomikirihl";

const HIGHLIGHT_CSS = `${TAG_NAME} {
  display: inline;
  background-color: lightgray !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
}

${TAG_NAME}.unknown {
  background-color: red !important;
}
`;

export class Highlighter implements IHighlighter {
  static readonly type = "wrap";
  highlighted: boolean = false;

  constructor() {
    const style = document.createElement("style");
    style.innerHTML = HIGHLIGHT_CSS;
    document.head.appendChild(style);
  }

  /** May modify range */
  highlight(range: Range) {
    this.highlightRange(range, false);
  }

  highlightRed(range: Range) {
    this.highlightRange(range, true);
  }

  /** Unhighlight all */
  unhighlight() {
    for (const node of document.getElementsByTagName(TAG_NAME)) {
      unhighlightElement(node);
    }
    this.highlighted = false;
  }

  /** unknown: highlight red for unknown tokens */
  private highlightRange(range: Range, unknown: boolean) {
    const existing = [...document.getElementsByTagName(TAG_NAME)];
    if (existing.length != 0 && range.intersectsNode(existing[0])) {
      return;
    }
    const nodes = textNodesInRange(range);
    const hls: Element[] = [];
    for (const node of nodes) {
      hls.push(highlightNode(node, unknown));
    }
    range.setStartBefore(hls[0]);
    range.setStartBefore(hls[hls.length - 1]);
    for (const node of existing) {
      unhighlightElement(node);
    }
    this.highlighted = true;
  }
}

Highlighter satisfies IHighlighterStatic;

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

export const highlighter = new Highlighter();
