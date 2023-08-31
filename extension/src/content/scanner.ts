import type { Token, TokenizeRequest, TokenizeResult } from "@platform/backend";
import Utils from "~/utils";
import { Entry } from "~/dicEntry";
import { containsJapaneseContent } from "~/japanese";
import { Backend } from "~/backend";

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

/** Find token at point (x, y) */
export namespace Scanner {
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

  interface CharacterLocation {
    node: Text;
    charAt: number;
  }

  // cache last scan.
  let _lastScannedResult: ScanResult | null = null;

  /** Returns null if (x,y) is not pointing to valid japanese token */
  /*
    1. Get location(char) of mouse position (node+charpos)
    2. Scan sentence of that char
    3. Tokenize sentence
    4. Get position of token at position
  */
  export async function scanAt(
    x: number,
    y: number
  ): Promise<ScanResult | null> {
    if (_lastScannedResult !== null) {
      if (Utils.containsPoint(_lastScannedResult.range, x, y)) {
        return _lastScannedResult;
      }
    }

    const sentence = scanSentence(x, y);
    if (sentence === null) return null;

    const prev = sentence.prev ?? "";
    const tokenizeReq: TokenizeRequest = {
      text: fullSentence(sentence),
      charAt: prev.length + sentence.idx,
    };
    const tokenizeResult = await Backend.tokenize(tokenizeReq);
    if (!isValidJapaneseToken(tokenizeResult)) return null;
    const result = scanToken(tokenizeResult, sentence);
    _lastScannedResult = result;
    return result;
  }

  export function scanSentence(x: number, y: number): ScannedSentence | null {
    const location = characterLocationAt(x, y);
    if (location === null) return null;
    return sentenceAtCharacterLocation(location.node, location.charAt);
  }

  /** Binary search inside a Text node to find character location of (x,y) */
  function characterLocationAt(x: number, y: number): CharacterLocation | null {
    const element = document.elementFromPoint(x, y);
    if (element === null) return null;
    const node = childTextAt(element, x, y);
    if (node === null) return null;

    let range = new Range();
    let start = 0;
    let end = node.data.length;

    while (end - start > 7) {
      let mid = Math.floor((start + end) / 2);

      range.setStart(node, start);
      range.setEnd(node, mid);
      if (Utils.containsPoint(range, x, y)) {
        end = mid;
      } else {
        // assume (mid, end) contains (x,y)
        // if it doesn't, this function will still return null
        // because of linear search below
        start = mid;
      }
    }

    while (start < end) {
      range.setStart(node, start);
      range.setEnd(node, start + 1);
      if (Utils.containsPoint(range, x, y)) {
        return {
          node: node,
          charAt: start,
        };
      } else {
        start += 1;
      }
    }

    return null;
  }

  /*
  1. Find closest sentence-ending char before charAt in node.
  2. If it doesn't exist, prepend sentence-part before this node.
  3. Find closest sentence-ending char after(including) charAt in node.
  4. If it doesn't exist, append sentence-part after this node.
  */
  export function sentenceAtCharacterLocation(
    node: Text,
    charAt: number
  ): ScannedSentence {
    const text = node.data;

    let currSentence: string;
    let stStartIdx: number | undefined;
    let prev: string | undefined;
    let stEndIdx: number | undefined;
    let next: string | undefined;

    let start: number;
    for (start = charAt; start > 0; start--) {
      if (isSentenceEndChar(text[start - 1])) {
        break;
      }
    }
    currSentence = text.substring(start, charAt);
    if (start === 0) {
      prev = sentenceBeforeNode(node);
    } else {
      stStartIdx = start;
    }

    let end: number;
    for (end = charAt; end < text.length; end++) {
      if (isSentenceEndChar(text[end])) {
        break;
      }
    }
    if (end === text.length) {
      currSentence += text.substring(charAt, end);
      next = sentenceAfterNode(node);
    } else {
      currSentence += text.substring(charAt, end + 1);
      stEndIdx = end + 1;
    }

    return {
      node,
      idx: charAt,
      curr: currSentence,
      prev,
      stStartIdx,
      next,
      stEndIdx,
    } as ScannedSentence;
  }

  /**
   * Get prev (next) Text node. (Which is not a child of curr)
   * Does not check if curr is inline. if PREV is false, get next node.
   */
  // when it recursively calls itself, new curr is always before(after) old curr
  // so recursion is guranteed to end.
  function inlineTextNode(curr: Node, PREV: boolean): Text | null {
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
      return inlineTextNode(curr, PREV);
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
        return inlineTextNode(curr, PREV);
      }
      if (!nodeIsInline(curr)) return null;
    }
    if (!(curr instanceof Text)) {
      return inlineTextNode(curr, PREV);
    }
    return curr;
  }

  function prevInlineTextNode(curr: Node) {
    return inlineTextNode(curr, true);
  }

  function nextInlineTextNode(curr: Node) {
    return inlineTextNode(curr, false);
  }

  /** Extract initial part of the sentence in nodes before `node`. */
  function sentenceBeforeNode(t: Text): string {
    let sentence = "";
    let node: Text | null = t;
    while (true) {
      node = prevInlineTextNode(node);
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

  function sentenceAfterNode(t: Text): string {
    let sentence = "";
    let node: Text | null = t;
    while (true) {
      node = nextInlineTextNode(node);
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
  function scanToken(
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
        const prev = prevInlineTextNode(prevNode);
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
        const next = nextInlineTextNode(nextNode);
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
}
