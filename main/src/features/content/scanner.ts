import Utils, { isElementNode, isTextNode } from "@/features/utils";

export interface CharAtString {
  text: string;
  charAt: number;
}

export interface CharLocation {
  node: Text;
  charAt: number;
}

export function textNodeAtPos(x: number, y: number): Text | null {
  const element = document.elementFromPoint(x, y);
  if (element === null) return null;
  const node = childTextAt(element, x, y);
  if (node === null) return null;

  return node;
}

/** Binary search inside a Text node to find character location of (x,y) */
export function charLocationAtPos(x: number, y: number): CharLocation | null {
  const node = textNodeAtPos(x, y);
  if (node === null) return null;

  const range = new Range();
  let start = 0;
  let end = node.data.length;

  while (end - start > 7) {
    const mid = Math.floor((start + end) / 2);

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
export function sentenceAtCharLocation(
  node: Text,
  charAt: number,
): CharAtString {
  const text = node.data;

  let sentence: string;
  let charAtSentence: number;

  let start: number;
  for (start = charAt; start > 0; start--) {
    if (isSentenceEndChar(text[start - 1])) {
      break;
    }
  }
  sentence = text.substring(start, charAt);
  charAtSentence = charAt - start;
  if (start === 0) {
    const prev = sentenceBeforeNode(node);
    sentence = prev + sentence;
    charAtSentence += prev.length;
  }

  let end: number;
  for (end = charAt; end < text.length; end++) {
    if (isSentenceEndChar(text[end])) {
      break;
    }
  }
  if (end === text.length) {
    sentence += text.substring(charAt, end);
    sentence += sentenceAfterNode(node);
  } else {
    sentence += text.substring(charAt, end + 1);
  }

  return {
    text: sentence,
    charAt: charAtSentence,
  };
}

/** Returns list of Nodes that make up a token.
 * - currNode
 * - charIdxInCurrNode: index of current character in currNode
 * - tokenLength: length of token text
 * - tokenCharIdx: index of current character in token
 */
export function nodesOfToken(
  currNode: Text,
  charIdxInCurrNode: number,
  tokenLength: number,
  tokenCharIdx: number,
): Text[] {
  const nextNodes: Text[] = [];
  let node = currNode;
  let charCount = tokenLength - tokenCharIdx;
  const remaining = node.data.length - charIdxInCurrNode;
  if (charCount < remaining) {
    node.splitText(charIdxInCurrNode + charCount);
  } else {
    charCount -= remaining;
    while (charCount > 0) {
      const nextNode = nextInlineTextNode(node);
      if (nextNode === null) {
        break;
      }
      const count = nextNode.data.length;
      if (count > charCount) {
        nextNode.splitText(charCount);
      }
      nextNodes.push(nextNode);
      charCount -= count;
      node = nextNode;
    }
  }

  const prevNodes: Text[] = [];
  node = currNode;
  charCount = tokenCharIdx;
  if (charCount < charIdxInCurrNode) {
    currNode = node.splitText(charIdxInCurrNode - charCount);
  } else {
    charCount -= charIdxInCurrNode;
    while (charCount > 0) {
      let prevNode = prevInlineTextNode(node);
      if (prevNode === null) {
        break;
      }
      const count = prevNode.data.length;
      if (count > charCount) {
        prevNode = prevNode.splitText(count - charCount);
      }
      prevNodes.push(prevNode);
      charCount -= count;
      node = prevNode;
    }
  }

  return [...prevNodes.reverse(), currNode, ...nextNodes];
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
  curr = (PREV ? curr.previousSibling : curr.nextSibling)!;
  if (!(isElementNode(curr) || isTextNode(curr)) || nodeIsOutOfFlow(curr)) {
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
    if (!(isElementNode(curr) || isTextNode(curr)) || nodeIsOutOfFlow(curr)) {
      return inlineTextNode(curr, PREV);
    }
    if (!nodeIsInline(curr)) return null;
  }
  if (!isTextNode(curr)) {
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
    for (const char of text) {
      if (isSentenceEndChar(char)) {
        sentence = sentence + char;
        return sentence;
      } else {
        sentence = sentence + char;
      }
    }
  }
}

/** Find child `Text` node at (x, y) if it exists. */
function childTextAt(parent: Element, x: number, y: number): Text | null {
  for (const child of parent.childNodes) {
    if (!isTextNode(child)) {
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

function isSentenceEndChar(char: string): boolean {
  return "。？！｡.?!".includes(char);
}

/**
 * 1) Node display is inline or ruby base
 * 2) Node position is static or relative
 *
 * Exception: \<br\> is not inline
 */
function nodeIsInline(node: Node): boolean {
  if (!isElementNode(node)) return true;

  if (node.tagName == "BR") return false;

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
function nodeIsOutOfFlow(node: Node): boolean {
  if (!isElementNode(node)) return false;
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
  if (!isElementNode(node)) return false;
  const styles = window.getComputedStyle(node);
  // support multi keyword display
  for (const value of styles.display.split(" ")) {
    if (["flex", "grid", "inline-flex", "inline-grid"].includes(value)) {
      return true;
    }
  }
  return false;
}
