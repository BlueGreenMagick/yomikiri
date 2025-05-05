import type { Hook, Rect } from "@/features/utils";

export interface IHighlighter {
  type: "selection" | "wrap";
  highlighted: boolean;
  onUnhighlight: Hook;

  highlightNodes: (nodes: Node[]) => void;
  /** For unknown tokens */
  highlightRed: (nodes: Node[]) => void;
  /** Unhighlight all */
  unhighlight: () => void;
  isHighlighted: (node: Text, charIdx?: number) => boolean;
  highlightedRects: () => Rect[];
}
