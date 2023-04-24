import Api from "../api";
import { Token } from "../tokenizer/tokenizer";

/*
Find token at point (x, y)
*/
export class Scanner {
  // cache last scan.
  /** last scanned Text node and its tokenized result */
  private lastScannedText: [Text, Token[]] | null = null;
  /** rect and token for the last scanned character */
  private lastScannedChar: [DOMRect, Token] | null = null;

  async scanAt(x: number, y: number): Promise<Token | null> {
    const token = this.withCache(x, y);
    if (token !== null) return token;

    const element = document.elementFromPoint(x, y);
    if (element === null) return null;
    const node = childTextAt(element, x, y);
    if (node === null) return null;

    const text = node.nodeValue as string;
    if (!stringContainsJapanese(text)) return null;
    const tokens = await Api.request("tokenize", text);
    this.lastScannedText = [node, tokens];

    return this.tokenAt(node, tokens, x, y);
  }

  /** Try scanning with cache. If cache is invalid, clear it to null. */
  private withCache(x: number, y: number): Token | null {
    // check caches
    if (this.lastScannedChar !== null) {
      const [rect, token] = this.lastScannedChar;
      if (rect && rectContainsPosition(rect, x, y)) {
        return token;
      }
    }
    this.lastScannedChar = null;

    if (this.lastScannedText !== null) {
      const [node, tokens] = this.lastScannedText;
      if (node && isAtTextNode(node, x, y)) {
        return this.tokenAt(node, tokens, x, y);
      }
    }
    this.lastScannedText = null;
    return null;
  }

  /** Sets this.lastScannedChar if token found. */
  private tokenAt(
    node: Text,
    tokens: Token[],
    x: number,
    y: number
  ): Token | null {
    const result = indexOfCharacterAt(node, x, y);
    if (result === null) return null;

    const [rect, charIndex] = result;
    const token = tokenAtCharacterIndex(tokens, charIndex);
    this.lastScannedChar = [rect, token];
    return token;
  }
}

/** Find child `Text` node at (x, y) if it exists. */
function childTextAt(parent: Element, x: number, y: number): Text | null {
  parent.normalize(); // normalize splitted Text nodes
  for (const child of parent.childNodes) {
    if (!(child instanceof Text)) {
      continue;
    }
    if (isAtTextNode(child, x, y)) {
      return child;
    }
  }
  return null;
}

/** (x,y) is inside `node` */
function isAtTextNode(node: Text, x: number, y: number): boolean {
  const range = new Range();
  range.selectNodeContents(node);
  const rects = range.getClientRects();
  for (const rect of rects) {
    if (rectContainsPosition(rect, x, y)) {
      return true;
    }
  }
  return false;
}

/**
 * Find character at (x, y) in `node` if it exists.
 */
function indexOfCharacterAt(
  node: Text,
  x: number,
  y: number
): [DOMRect, number] | null {
  const range = new Range();
  const text = node.nodeValue as string;
  // TODO: use binary algorithm to reduce to O(logn)
  for (let i = 0; i < text.length; i++) {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const rect = range.getBoundingClientRect();
    if (rectContainsPosition(rect, x, y)) {
      return [rect, i];
    }
  }
  return null; // is this reachable?
}

function tokenAtCharacterIndex(tokens: Token[], charIndex: number): Token {
  let currentIndex = 0;
  let token;
  for (token of tokens) {
    currentIndex += token.text.length;
    if (currentIndex > charIndex) {
      return token;
    }
  }
  throw new Error("character index out of range");
}

function rectContainsPosition(rect: DOMRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

// https://stackoverflow.com/a/15034560
const JAPANESE_REGEX =
  /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;

function stringContainsJapanese(text: string): boolean {
  return JAPANESE_REGEX.test(text);
}
