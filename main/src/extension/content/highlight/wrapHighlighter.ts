import type { Rect } from "lib/utils";

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


export class WrapHighlighter {
  readonly type = "wrap";

  highlighted = false;

  /** Adds <style> to document head */
  constructor() {
    const style = document.createElement("style");
    style.textContent = HIGHLIGHT_CSS;
    document.head.appendChild(style);
  }

  /** May modify range */
  highlightNodes(nodes: Node[]) {
    this._highlightNodes(nodes, false);
  }

  highlightRed(nodes: Node[]) {
    this._highlightNodes(nodes, true);
  }

  /** Unhighlight all */
  unhighlight() {
    for (const node of [...document.getElementsByTagName(TAG_NAME)]) {
      this.unhighlightElement(node);
    }
    this.highlighted = false;
  }

  isHighlighted(node: Text, _charIdx = 0): boolean {
    if (!this.highlighted) return false;
    const parent = node.parentElement;
    if (parent === null) return false;
    return parent.tagName === TAG_NAME.toUpperCase();
  }

  highlightedRects(): Rect[] {
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

  private _highlightNodes(nodes: Node[], unknown: boolean) {
    const existing = [...document.getElementsByTagName(TAG_NAME)];
    for (const node of nodes) {
      this.highlightNode(node, unknown);
    }
    for (const node of existing) {
      this.unhighlightElement(node);
    }
    this.highlighted = true;
  }

  private highlightNode(node: Node, unknown: boolean): Element {
    const parent = node.parentNode as Node;
    const hl = document.createElement(TAG_NAME);
    if (unknown) {
      hl.classList.add("unknown");
    }
    parent.insertBefore(hl, node);
    hl.appendChild(node);
    return hl;
  }

  private unhighlightElement(elem: Element) {
    const parent = elem.parentNode;
    elem.replaceWith(...elem.childNodes);
    parent?.normalize();
  }
}