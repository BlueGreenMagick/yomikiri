/**
 * Highlights range using Selection API
 */

const selectionStyleElemId = "yomikiri-extension-selection-css";
let ignoreNextSelectionEventFire = 0;

export function highlightRange(range: Range) {
  let selection = window.getSelection();
  if (selection === null) return;
  ignoreNextSelectionEventFire += 2;
  selection.removeAllRanges();
  selection.addRange(range);
  changeSelectionColor();
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
