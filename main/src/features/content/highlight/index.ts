import { SelectionHighlighter } from "./selectionHighlighter";
import { WrapHighlighter } from "./wrapHighlighter";
import { Platform } from "#platform";

function getHighlighter():
  | typeof SelectionHighlighter
  | typeof WrapHighlighter {
  if (Platform.IS_DESKTOP) {
    return SelectionHighlighter;
  } else {
    return WrapHighlighter;
  }
}

export const Highlighter = getHighlighter();
export type Highlighter = SelectionHighlighter | WrapHighlighter;
