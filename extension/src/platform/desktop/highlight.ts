import type { IHighlighter, IHighlighterStatic } from "../types/highlight";

const STYLE_ID = "yomikiri-selection-css";
let ignoreNextSelectionEventFire = 0;

export class Highlighter implements IHighlighter {
  static readonly type = "selection";
  highlighted: boolean = false;
  private hasListener: boolean = false;

  /** May modify range */
  highlight(range: Range) {
    this.highlightRange(range);
    this.changeSelectionColor("#a0a0a0a0");
  }

  highlightRed(range: Range) {
    this.highlightRange(range);
    this.changeSelectionColor("#ff2626a0");
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

  /** Call this.changeSelectionColor afterwards */
  private highlightRange(range: Range) {
    let selection = window.getSelection();
    if (selection === null) return;

    if (selection.rangeCount > 0) {
      selection.removeAllRanges();
      ignoreNextSelectionEventFire += 1;
    }
    selection.addRange(range);
    ignoreNextSelectionEventFire += 1;
    this.highlighted = true;
  }

  private changeSelectionColor(color: string) {
    let styleEl = document.getElementById(STYLE_ID);
    if (styleEl === null) {
      styleEl = document.createElement("style");
    }
    styleEl.innerHTML = `::selection { background-color: ${color} !important; }`;
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);

    if (!this.hasListener) {
      const self = this;
      const listener = () => {
        if (ignoreNextSelectionEventFire) {
          ignoreNextSelectionEventFire -= 1;
          return;
        }
        revertSelectionColor();
        document.removeEventListener("selectionchange", listener);
        self.hasListener = false;
      };
      document.addEventListener("selectionchange", listener);
      this.hasListener = true;
    }
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
