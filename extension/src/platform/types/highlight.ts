export interface IHighlighter {
  highlighted: boolean;
  highlight: (range: Range) => void;
  /** For unknown tokens */
  highlightRed: (range: Range) => void;
  /** Unhighlight all */
  unhighlight: () => void;
}

export interface IHighlighterStatic {
  type: "selection" | "wrap";
}

// export const highlighter: Highlighter
