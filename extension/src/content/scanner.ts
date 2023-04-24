import Api from "../api";
import { Token } from "../tokenizer/tokenizer";

export interface ScanResult {
  token: Token;
  /** range that has token text selected */
  range: Range;
}

/** Find token at point (x, y) */
export class Scanner {
  // cache last scan.
  private lastScannedResult: ScanResult | null = null;
  /** last scanned Text node and its tokenized tokens */
  private lastScannedText: [Text, Token[]] | null = null;

  async scanAt(x: number, y: number): Promise<ScanResult | null> {
    const cacheResult = this.withCache(x, y);
    if (cacheResult !== null) return cacheResult;

    const element = document.elementFromPoint(x, y);
    if (element === null) return null;
    const node = childTextAt(element, x, y);
    if (node === null) return null;

    const text = node.nodeValue as string;
    if (!stringContainsJapanese(text)) return null;
    const tokens = await Api.request("tokenize", text);
    this.lastScannedText = [node, tokens];

    const result = scanTokenAt(node, tokens, x, y);
    this.lastScannedResult = result;
    return result;
  }

  /** Try scanning with cache. If cache is invalid, clear it to null. */
  private withCache(x: number, y: number): ScanResult | null {
    // check caches
    if (this.lastScannedResult !== null) {
      const result = this.lastScannedResult;
      if (rangeContainsPoint(result.range, x, y)) {
        return result;
      }
    }

    if (this.lastScannedText !== null) {
      const [node, tokens] = this.lastScannedText;
      const range = new Range();
      range.selectNodeContents(node);
      if (rangeContainsPoint(range, x, y)) {
        const result = scanTokenAt(node, tokens, x, y);
        this.lastScannedResult = result;
        if (result !== null) {
          return result;
        }
      }
    }
    this.lastScannedText = null;
    return null;
  }
}

// https://stackoverflow.com/a/15034560
const JAPANESE_REGEX =
  /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;

function stringContainsJapanese(text: string): boolean {
  return JAPANESE_REGEX.test(text);
}

function rectContainsPoint(rect: DOMRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function rangeContainsPoint(range: Range, x: number, y: number): boolean {
  const rects = range.getClientRects();
  for (const rect of rects) {
    if (rectContainsPoint(rect, x, y)) {
      return true;
    }
  }
  return false;
}

/** Find child `Text` node at (x, y) if it exists. */
function childTextAt(parent: Element, x: number, y: number): Text | null {
  parent.normalize(); // normalize splitted Text nodes
  for (const child of parent.childNodes) {
    if (!(child instanceof Text)) {
      continue;
    }
    const range = new Range();
    range.selectNodeContents(child);
    if (rangeContainsPoint(range, x, y)) {
      return child;
    }
  }
  return null;
}

/**
 * Find character at (x, y) in `node` if it exists.
 */
function indexOfCharacterAt(node: Text, x: number, y: number): number | null {
  const range = new Range();
  const text = node.nodeValue as string;
  // TODO: maybe on large texts use binary algorithm to reduce to O(logn)
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    if (rangeContainsPoint(range, x, y)) {
      return i;
    }
  }
  return null; // is this reachable?
}

function tokenAtCharacterIndex(tokens: Token[], charIndex: number): Token {
  let currentIndex = 0;
  for (let token of tokens) {
    currentIndex += token.text.length;
    if (currentIndex > charIndex) {
      return token;
    }
  }
  throw new Error("character index out of range");
}

function scanTokenAt(
  node: Text,
  tokens: Token[],
  x: number,
  y: number
): ScanResult | null {
  const charIndex = indexOfCharacterAt(node, x, y);
  if (charIndex === null) return null;
  const token = tokenAtCharacterIndex(tokens, charIndex);
  if (token === null) return null;
  const range = selectTokenRange(node, token, charIndex);

  return { token, range };
}

function selectTokenRange(node: Text, token: Token, charIdx: number): Range {
  const endIdx = charIdx + token.text.length;
  const range = new Range();
  range.setStart(node, charIdx);
  range.setEnd(node, endIdx);
  return range;
}
