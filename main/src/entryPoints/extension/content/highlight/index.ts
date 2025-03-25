import type { Rect } from "@/lib/utils";
import { SelectionHighlighter } from "./selectionHighlighter";
import { WrapHighlighter } from "./wrapHighlighter";
import { Platform } from "#platform";

export interface IHighlighter {
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
