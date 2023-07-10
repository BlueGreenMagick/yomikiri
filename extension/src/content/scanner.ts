import { Api } from "~/api";
import type { Token, TokenizeResult } from "@platform/backend";
import Utils from "~/utils";
import { Entry } from "~/dicEntry";
import { containsJapaneseContent } from "~/japanese";

export interface ScanResult {
  token: Token;
  /** range that has token text selected */
  range: Range;
  /** sentence[startIdx, endIdx) is token text */
  sentence: string;
  startIdx: number;
  endIdx: number;
  sentenceTokens: Token[];
  tokenIdx: number;
  dicEntries: Entry[];
}

/**
 * (prev, after) are portion of sentence before and after node
 * prev + curr + after is the constructed sentence
 * stStartIdx, stEndIdx are index of sentence start and end (excluding) in curr node.
 */
interface ScannedSentenceBase {
  node: Text;
  // portion of sentence before, within, and after `node`
  curr: string;
  /** curr[idx] is the character at (x,y) */
  idx: number;
}
type ScannedSentencePrev =
  | { prev: string; stStartIdx?: never }
  | { prev?: never; stStartIdx: number };
type ScannedSentenceNext =
  | { next: string; stEndIdx?: never }
  | { next?: never; stEndIdx: number };

type ScannedSentence = ScannedSentenceBase &
  ScannedSentencePrev &
  ScannedSentenceNext;

/** Find token at point (x, y) */
export class Scanner {
  // cache last scan.
  private lastScannedResult: ScanResult | null = null;

  /** Returns null if (x,y) is not pointing to valid japanese token */
  async scanAt(x: number, y: number): Promise<ScanResult | null> {
    if (this.lastScannedResult !== null) {
      if (Utils.containsPoint(this.lastScannedResult.range, x, y)) {
        return this.lastScannedResult;
      }
    }

    const sentence = this.scanSentence(x, y);
    if (sentence === null) return null;

    const prev = sentence.prev ?? "";
    const tokenizeReq = {
      text: fullSentence(sentence),
      charIdx: prev.length + sentence.idx,
    };
    const tokenizeResult = await Api.request("tokenize", tokenizeReq);
    if (!isValidJapaneseToken(tokenizeResult)) return null;
    const result = this.scanToken(tokenizeResult, sentence);
    this.lastScannedResult = result;
    return result;
  }

  // within inline elements.
  private scanSentence(x: number, y: number): null | ScannedSentence {
    const element = document.elementFromPoint(x, y);
    if (element === null) return null;
    const node = childTextAt(element, x, y);
    if (node === null) return null;

    const text = node.data;
    if (!containsJapaneseContent(text)) return null;

    let prev: string;
    let next: string;

    // split sentence and check if (x,y) is in range of sentence
    const range = new Range();
    // index of first char of current sentence
    let stStart = 0;
    // index of character at (x,y)
    let foundChar = -1;
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      if (Utils.containsPoint(range, x, y)) {
        foundChar = i;
      }

      if (isSentenceEndChar(text[i])) {
        if (foundChar >= 0) {
          const partial = {
            node,
            curr: text.substring(stStart, i + 1),
            idx: foundChar - stStart,
            stEndIdx: i + 1,
          };
          if (stStart === 0) {
            prev = this.sentenceBeforeNode(node);
            return {
              ...partial,
              prev: prev,
            };
          } else {
            return {
              ...partial,
              stStartIdx: stStart,
            };
          }
        }
        stStart = i + 1;
      }
    }
    if (foundChar < 0) {
      return null;
    }
    next = this.sencenceAfterNode(node);
    const partial = {
      node,
      next,
      curr: text.substring(stStart, text.length),
      idx: foundChar - stStart,
    };
    // sentenceEndChar not found after char at (x,y)
    if (stStart === 0) {
      prev = this.sentenceBeforeNode(node);
      return {
        ...partial,
        prev,
      };
    } else {
      return {
        ...partial,
        stStartIdx: stStart,
      };
    }
  }

  /**
   * Get prev (next) Text node. (Which is not a child of curr)
   * Does not check if curr is inline. if PREV is false, get next node.
   */
  // when it recursively calls itself, new curr is always before(after) old curr
  // so recursion is guranteed to end.
  private inlineTextNode(curr: Node, PREV: boolean): Text | null {
    // get closest inline parent that has prev(next) sibling.
    while ((PREV ? curr.previousSibling : curr.nextSibling) === null) {
      if (curr.parentNode === null) return null;
      curr = curr.parentNode;
      if (!nodeIsInline(curr)) return null;
    }
    // get inline prev(next) sibling
    curr = (PREV ? curr.previousSibling : curr.nextSibling) as ChildNode;
    if (
      !(curr instanceof Element || curr instanceof Text) ||
      nodeIsOutOfFlow(curr)
    ) {
      // skip nodes that are removed from normal flow
      return this.inlineTextNode(curr, PREV);
    }
    if (!nodeIsInline(curr)) return null;
    if (curr.parentNode !== null && nodeChildIsNotInline(curr.parentNode)) {
      return null;
    }
    // get inline last(first) leaf node
    while (curr.childNodes.length > 0) {
      curr = curr.childNodes[PREV ? curr.childNodes.length - 1 : 0];
      if (
        !(curr instanceof Element || curr instanceof Text) ||
        nodeIsOutOfFlow(curr)
      ) {
        return this.inlineTextNode(curr, PREV);
      }
      if (!nodeIsInline(curr)) return null;
    }
    if (!(curr instanceof Text)) {
      return this.inlineTextNode(curr, PREV);
    }
    return curr;
  }

  private prevInlineTextNode(curr: Node) {
    return this.inlineTextNode(curr, true);
  }

  private nextInlineTextNode(curr: Node) {
    return this.inlineTextNode(curr, false);
  }

  /** Extract initial part of the sentence in nodes before `node`. */
  private sentenceBeforeNode(t: Text): string {
    let sentence = "";
    let node: Text | null = t;
    while (true) {
      node = this.prevInlineTextNode(node);
      if (node === null) {
        return sentence;
      }
      const text = node.data;
      for (let i = text.length - 1; i >= 0; i--) {
        if (isSentenceEndChar(text[i])) {
          return sentence;
        } else {
          sentence = text[i] + sentence;
        }
      }
    }
  }

  private sencenceAfterNode(t: Text): string {
    let sentence = "";
    let node: Text | null = t;
    while (true) {
      node = this.nextInlineTextNode(node);
      if (node === null) {
        return sentence;
      }
      const text = node.data;
      for (let i = 0; i < text.length; i++) {
        if (isSentenceEndChar(text[i])) {
          sentence = sentence + text[i];
          return sentence;
        } else {
          sentence = sentence + text[i];
        }
      }
    }
  }

  /** Find token in DOM and create range over it */
  private scanToken(
    tokenizeResult: TokenizeResult,
    sentence: ScannedSentence
  ): ScanResult | null {
    const range = new Range();
    const token = tokenizeResult.tokens[tokenizeResult.tokenIdx];
    const tokenStartIndex = token.start;

    if (sentence.stStartIdx !== undefined) {
      range.setStart(sentence.node, sentence.stStartIdx + tokenStartIndex);
    } else {
      // number of characters in token that is in previous nodes
      let prevChars = sentence.prev.length - tokenStartIndex;
      let prevNode: Text = sentence.node;
      while (prevChars > 0) {
        const prev = this.prevInlineTextNode(prevNode);
        if (prev === null) break;
        prevNode = prev;
        prevChars -= prevNode.data.length;
      }
      range.setStart(prevNode, prevChars > 0 ? 0 : -1 * prevChars);
    }

    const prev = sentence.prev ?? "";
    const currTokenStartIdx = tokenStartIndex - prev.length;
    if (sentence.stEndIdx !== undefined) {
      const endIdx =
        sentence.stEndIdx -
        sentence.curr.length +
        currTokenStartIdx +
        token.text.length;
      range.setEnd(sentence.node, endIdx);
    } else {
      let nextNode: Text = sentence.node;
      // number of characters in token that is in next nodes
      let nextChars =
        currTokenStartIdx + token.text.length - sentence.curr.length;
      while (nextChars > 0) {
        const next = this.nextInlineTextNode(nextNode);
        if (next === null) break;
        nextNode = next;
        nextChars -= nextNode.data.length;
      }
      range.setEnd(
        nextNode,
        nextNode.data.length + (nextChars > 0 ? 0 : nextChars)
      );
    }

    return {
      dicEntries: tokenizeResult.entries as Entry[],
      token,
      range,
      sentence: fullSentence(sentence).normalize("NFC"),
      startIdx: tokenStartIndex,
      endIdx: tokenStartIndex + token.text.length,
      sentenceTokens: tokenizeResult.tokens,
      tokenIdx: tokenizeResult.tokenIdx,
    };
  }
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
    if (Utils.containsPoint(range, x, y)) {
      return child;
    }
  }
  return null;
}

// returns [token, start character index of token]
function tokenAtCharacterIndex(
  tokens: Token[],
  charIndex: number
): [Token, number] {
  let currentIndex = 0;
  for (let token of tokens) {
    currentIndex += token.text.length;
    if (currentIndex > charIndex) {
      return [token, currentIndex - token.text.length];
    }
  }
  throw new Error("character index out of range");
}

function isSentenceEndChar(char: string): boolean {
  return "。？！｡.?!".includes(char);
}

function nodeIsInline(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  const styles = window.getComputedStyle(node);
  return (
    ["inline", "ruby", "ruby-base"].includes(styles.display) &&
    (styles.position === "static" || styles.position === "relative")
  );
}

/**
 * Return true if node is removed from normal flow of document. (or is sticky)
 * It is not possible for a node to be both isInline and isOutOfFlow
 */
export function nodeIsOutOfFlow(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  const styles = window.getComputedStyle(node);
  return (
    styles.display === "none" ||
    styles.display === "ruby-text" ||
    !(styles.position === "static" || styles.position === "relative") ||
    node.tagName === "RT"
  );
}

/** Returns true if node is flex or grid in which its child is assumed not inline */
function nodeChildIsNotInline(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  const styles = window.getComputedStyle(node);
  // support multi keyword display
  for (const value of styles.display.split(" ")) {
    if (["flex", "grid", "inline-flex", "inline-grid"].includes(value)) {
      return true;
    }
  }
  return false;
}

function fullSentence(st: ScannedSentence): string {
  const prev = st.prev ?? "";
  const next = st.next ?? "";
  return prev + st.curr + next;
}

function isValidJapaneseToken(result: TokenizeResult) {
  const token = result.tokens[result.tokenIdx];
  return containsJapaneseContent(token.text);
}
