import type { IHighlighter, IHighlighterStatic } from "../types/highlight";

const STYLE_ID = "yomikiri-selection-css";
let ignoreNextSelectionEventFire = 0;

export class Highlighter implements IHighlighter {
  static readonly type = "selection";
  highlighted: boolean = false;

  /** May modify range */
  highlightRange(range: Range) {
    let selection = window.getSelection();
    if (selection === null) return;

    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
      ignoreNextSelectionEventFire += 1;
    }
    selection.addRange(range);
    ignoreNextSelectionEventFire += 1;
    this.changeSelectionColor();
    this.highlighted = true;
  }

  /** Unhighlight all */
  unhighlight() {
    if (!this.highlighted) {
      return;
    }
    this.highlighted = false;
    let selection = document.getSelection();
    if (selection === null) return;
    selection.removeAllRanges();
    revertSelectionColor();
  }

  private changeSelectionColor() {
    if (document.getElementById(STYLE_ID)) return;

    const styleEl = document.createElement("style");
    styleEl.innerHTML = "::selection { background-color: lightgray }";
    styleEl.id = STYLE_ID;
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
}

Highlighter satisfies IHighlighterStatic;

function revertSelectionColor() {
  const elem = document.getElementById(STYLE_ID);
  if (elem !== null) {
    elem.parentElement?.removeChild(elem);
  }
}

export const highlighter = new Highlighter();
