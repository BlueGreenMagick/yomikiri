import type { Rect } from "@/features/utils";

export interface IHighlighter {
  type: "selection" | "wrap";
  highlighted: boolean;
  highlightNodes: (nodes: Node[]) => void;
  /** For unknown tokens */
  highlightRed: (nodes: Node[]) => void;
  /** Unhighlight all */
  unhighlight: () => void;
  isHighlighted: (node: Text, charIdx?: number) => boolean;
  highlightedRects: () => Rect[];
}
