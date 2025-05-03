import Utils from "@/features/utils";
import type { Rect } from "@/features/utils";

interface SelectionData {
  anchorNode: Node;
  anchorOffset: number;
  focusNode: Node;
  focusOffset: number;
}

const STYLE_ID = "yomikiri-selection-css";

export class SelectionHighlighter {
  readonly type = "selection";

  highlighted = false;
  /**
   * Selection data on last highlight.
   * This property may not be cleared when unhighlighted
   */
  selectionData: SelectionData | null = null;

  constructor(hideTooltip: () => void) {
    document.addEventListener("selectionchange", (_ev) => {
      if (!this.highlighted) {
        return;
      }

      // Check if selection has not been changed
      //
      // 1. selectionchange event is fired when selection is first set
      //
      // 2. Firefox emit selectionchange events when Text nodes are normalized
      // which cannot be caught by ignoreNextSelectionEventFire
      const selection = document.getSelection();
      if (
        selection !== null &&
        this.selectionData !== null &&
        selection.anchorNode === this.selectionData.anchorNode &&
        selection.anchorOffset === this.selectionData.anchorOffset &&
        this.selectionData.focusNode === selection.focusNode &&
        this.selectionData.focusOffset === selection.focusOffset
      ) {
        return;
      }

      this.revertSelectionColor();
      this.highlighted = false;
      hideTooltip();
    });
  }

  /** May modify range */
  highlightNodes(nodes: Node[]) {
    Utils.log("highlight", nodes);
    this._highlightNodes(nodes);
    this.changeSelectionColor("#a0a0a0a0");
  }

  highlightRed(nodes: Node[]) {
    this._highlightNodes(nodes);
    this.changeSelectionColor("#ff2626a0");
  }

  isHighlighted(node: Text, charIdx = 0): boolean {
    if (!this.highlighted) return false;
    const selection = document.getSelection();
    if (selection === null) {
      this.highlighted = false;
      return false;
    }
    if (selection.rangeCount === 0) {
      this.highlighted = false;
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
  unhighlight() {
    if (!this.highlighted) {
      return;
    }
    this.highlighted = false;
    const selection = document.getSelection();
    if (selection === null) return;
    selection.removeAllRanges();
    this.revertSelectionColor();
  }

  highlightedRects(): Rect[] {
    const selection = window.getSelection();
    if (selection === null) return [];

    return [...selection.getRangeAt(0).getClientRects()];
  }

  private _highlightNodes(nodes: Node[]) {
    const selection = window.getSelection();
    if (selection === null) return;

    const lastNode = nodes[nodes.length - 1];
    selection.setBaseAndExtent(
      nodes[0],
      0,
      lastNode,
      lastNode.textContent?.length ?? lastNode.childNodes.length,
    );
    if (selection.anchorNode === null || selection.focusNode === null) {
      return;
    }
    this.highlighted = true;
    nodes[0].parentNode?.normalize();
    lastNode.parentNode?.normalize();
    this.selectionData = {
      anchorNode: selection.anchorNode,
      anchorOffset: selection.anchorOffset,
      focusNode: selection.focusNode,
      focusOffset: selection.focusOffset,
    };
  }

  private changeSelectionColor(color: string) {
    let styleEl = document.getElementById(STYLE_ID);
    if (styleEl === null) {
      styleEl = document.createElement("style");
    }
    styleEl.textContent = `::selection { background-color: ${color} !important; }`;
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  private revertSelectionColor() {
    const elem = document.getElementById(STYLE_ID);
    if (elem !== null) {
      elem.parentElement?.removeChild(elem);
    }
  }
}
