import Api from "../api";
import { Token } from "../tokenizer/tokenizer";

export class Scanner {
  async scanAt(x: number, y: number): Promise<Token | null> {
    const element = document.elementFromPoint(x, y);
    if (element === null) return null;

    // 1. if element has text node, and the Text contains position
    const node = this.textChildNodeAt(element, x, y);
    if (node !== null) {
      return await this.scanTextNode(node, x, y);
    } else {
      // 2. TODO: if element is input or textarea
    }

    return null;
  }
  /**
   * When leaf node at (x, y) is a `Text`.
   */
  private async scanTextNode(node: Text, x: number, y: number) {
    let text = node.nodeValue as string;
    const tokensP = Api.request("tokenize", text);

    if (!stringContainsJapanese(text)) return null;
    const charIndex = this.indexOfCharacterAt(node, x, y);
    if (charIndex === null) return null;

    const tokens = await tokensP;
    const token = tokenAtCharacterIndex(tokens, charIndex);

    return token;
  }

  /** Find child `Text` node at (x, y) if it exists. */
  private textChildNodeAt(parent: Element, x: number, y: number): Text | null {
    parent.normalize(); // normalize splitted Text nodes
    const range = new Range();
    for (const child of parent.childNodes) {
      if (!(child instanceof Text)) {
        continue;
      }
      range.selectNodeContents(child);
      const rects = range.getClientRects();
      for (const rect of rects) {
        if (rectContainsPosition(rect, x, y)) {
          return child;
        }
      }
    }
    return null;
  }

  /**
   * Find character at (x, y) in `node` if it exists.
   */
  private indexOfCharacterAt(node: Text, x: number, y: number): number | null {
    const range = new Range();
    let text = node.nodeValue as string;
    // TODO: use binary algorithm to reduce to O(logn)
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      let rect = range.getBoundingClientRect();
      if (rectContainsPosition(rect, x, y)) {
        return i;
      }
    }
    return null; // is this reachable?
  }
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
