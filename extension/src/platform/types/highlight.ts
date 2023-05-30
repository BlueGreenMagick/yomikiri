export interface IHighlighter {
  highlighted: boolean;
  highlightRange: (range: Range) => void;
  /** Unhighlight all */
  unhighlight: () => void;
}

export interface IHighlighterStatic {
  type: "selection" | "wrap";
}

// export const highlighter: Highlighter
