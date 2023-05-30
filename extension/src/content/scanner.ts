import Api from "~/api";
import type { Token, TokenizeResult } from "~/tokenizer";
import Utils from "~/utils";
import { Entry } from "~/dictionary";

const TAG_NAME = "yomikirihl";
const HIGHLIGHT_CSS = `${TAG_NAME} {
  background-color: lightgray !important;
}`;

export interface ScanResult {
  token: Token;
  /** range that has token text selected */
  range: Range;
  /** sentence[startIdx, endIdx) is token text */
  sentence: string;
  startIdx: number;
  endIdx: number;
  sentenceTokens: Token[];
  dicEntries: Entry[];
}

/** prev + sentence + after is the constructed sentence */
interface ScannedSentence {
  node: Text;
  // portion of sentence before, within, and after `node`
  prev?: string;
  curr: string;
  after?: string;
  /** curr[idx] is the character at (x,y) */
  idx: number;
}

/** Find token at point (x, y) */
export class Scanner {
  // cache last scan.
  private lastScannedResult: ScanResult | null = null;
  private highlighted: boolean = false;

  constructor() {
    this.setupCSS();
  }

  /** Insert HIGHLIGHT_CSS */
  private setupCSS() {
    const styling = document.createElement("style");
    styling.innerHTML = HIGHLIGHT_CSS;
    document.head.appendChild(styling);
  }

  unhighlightElement(elem: Element) {
    const parent = elem.parentNode;
    elem.replaceWith(...elem.childNodes);
    parent?.normalize();
  }

  private highlightNode(node: Node) {
    const parent = node.parentNode as Node;
    const hl = document.createElement(TAG_NAME);
    parent.insertBefore(hl, node);
    hl.appendChild(node);
  }

  async scanAt(x: number, y: number): Promise<ScanResult | null> {
    const currentHighlights = [...document.getElementsByTagName(TAG_NAME)];
    for (const elem of currentHighlights) {
      if (Utils.containsPoint(elem, x, y)) {
        return null;
      }
    }

    const sentence = this.scanSentence(x, y);
    if (sentence === null) return null;

    const prev = sentence.prev ?? "";
    const after = sentence.after ?? "";
    const tokenizeReq = {
      text: prev + sentence.curr + after,
      selectedCharIdx: prev.length + sentence.idx,
    };
    const tokenizeResult = await Api.request("tokenize", tokenizeReq);
    const result = this.scanAndHighlightToken(tokenizeResult, sentence);
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
    if (!stringContainsJapanese(text)) return null;

    let prev, after;

    // split sentence and check if (x,y) is in range of sentence
    const range = new Range();
    let stStart = 0;
    let foundChar = -1;
    for (let i = 0; i < text.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      if (Utils.containsPoint(range, x, y)) {
        foundChar = i;
      }

      if (isSentenceEndChar(text[i])) {
        if (foundChar >= 0) {
          if (stStart === 0) {
            prev = this.sentenceBeforeNode(node);
          }
          return {
            node,
            prev,
            curr: text.substring(stStart, i + 1),
            idx: foundChar - stStart,
          };
        }

        stStart = i + 1;
      }
    }
    if (foundChar < 0) {
      return null;
    }
    if (stStart === 0) {
      prev = this.sentenceBeforeNode(node);
    }
    after = this.sencenceAfterNode(node);

    return {
      node,
      prev,
      after,
      curr: text.substring(stStart, text.length),
      idx: foundChar,
    };
  }

  /** does not check if curr is inline. if PREV is false, get next node. */
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
      return this.inlineTextNode(curr, PREV);
    }
    if (!nodeIsInline(curr)) return null;
    if (curr.parentNode === null || nodeChildIsNotInline(curr.parentNode)) {
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

  /** Find token in DOM and highlight */
  private scanAndHighlightToken(
    tokenizeResult: TokenizeResult,
    sentence: ScannedSentence
  ): ScanResult | null {
    const prev = sentence.prev ?? "";
    const after = sentence.after ?? "";
    const node = sentence.node;
    const tokenStartIndex = tokenizeResult.selectedTokenStartCharIdx;
    const token = tokenizeResult.tokens[tokenizeResult.selectedTokenIdx];

    const prevHighlights = [...document.getElementsByTagName(TAG_NAME)];

    const nodesToHighlight: Text[] = [];
    let currNode: Text = node;
    // number of characters in token that is in previous sentence
    let prevChars = prev.length - tokenStartIndex;
    if (prevChars < 0) {
      currNode = currNode.splitText(-1 * prevChars);
    }
    let prevNode: Text = currNode;
    while (prevChars > 0) {
      const prev = this.prevInlineTextNode(prevNode);
      if (prev === null) break;
      prevNode = prev;
      if (prevChars < prevNode.data.length) {
        prevNode = prevNode.splitText(prevNode.data.length - prevChars);
      }
      nodesToHighlight.push(prevNode);
      prevChars -= prevNode.data.length;
    }

    let nextNode: Text = currNode;
    let nextChars =
      tokenStartIndex + token.text.length - prev.length - sentence.curr.length;
    if (nextChars < 0) {
      currNode.splitText(currNode.data.length + nextChars);
    }
    while (nextChars > 0) {
      const next = this.nextInlineTextNode(nextNode);
      if (next === null) break;
      nextNode = next;
      if (nextChars < nextNode.data.length) {
        nextNode.splitText(nextChars);
      }
      nodesToHighlight.push(nextNode);
      nextChars -= nextNode.data.length;
    }
    nodesToHighlight.push(currNode);

    for (const node of nodesToHighlight) {
      const highlighted = this.highlightNode(node);
    }

    for (const elem of prevHighlights) {
      this.unhighlightElement(elem);
    }

    const range = new Range();
    const hls = document.getElementsByTagName(TAG_NAME);
    range.setStartBefore(hls[0]);
    range.setEndAfter(hls[hls.length - 1]);

    const sent = prev + sentence.curr + after;
    return {
      dicEntries: tokenizeResult.selectedDicEntry as Entry[],
      token,
      range,
      sentence: sent.trim(),
      startIdx: tokenStartIndex,
      endIdx: tokenStartIndex + token.text.length,
      sentenceTokens: tokenizeResult.tokens,
    };
  }
}

// https://stackoverflow.com/a/15034560
const JAPANESE_REGEX =
  /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/;

function stringContainsJapanese(text: string): boolean {
  return JAPANESE_REGEX.test(text);
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

// It is not possible for a node to be both inline and out of flow.
function nodeIsOutOfFlow(node: Node): boolean {
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
