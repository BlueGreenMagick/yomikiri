import type { SelectionHighlighter } from "./selectionHighlighter";
import type { WrapHighlighter } from "./wrapHighlighter";

export { SelectionHighlighter } from "./selectionHighlighter";
export { WrapHighlighter } from "./wrapHighlighter";
export type Highlighter = WrapHighlighter | SelectionHighlighter;
