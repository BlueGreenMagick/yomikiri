import { test, expect, describe, beforeAll } from "vitest";
import { sentenceAtCharLocation, nodesOfToken } from "./scanner";

beforeAll(() => {
  const styles = document.createElement("style");
  styles.textContent = `
* {
  display: block;
  position: static;
}
a, b, br, i, img, input, u, ruby, rb {
  display: inline;
}
rp {
  display: none;
}
`;

  document.head.appendChild(styles);
});

describe("sentenceAtCharLocation", () => {
  test("single sentence", () => {
    const container = prepareHTML(`<p>読み切りはすごい。</p>`);
    const textNode = selectTextNode(container, "p");

    const result = sentenceAtCharLocation(textNode, 0);
    expect(result.text).toEqual("読み切りはすごい。");
    expect(result.charAt).toEqual(0);
  });

  test("multiple sentences", () => {
    const container = prepareHTML(
      `<p>これは文章1。これは文章2。そして最後の文章。</p>`
    );
    const textNode = selectTextNode(container, "p");

    const result = sentenceAtCharLocation(textNode, 4);
    expect(result.text).toEqual("これは文章1。");
    expect(result.charAt).toEqual(4);

    const result2 = sentenceAtCharLocation(textNode, 8);
    expect(result2.text).toEqual("これは文章2。");
    expect(result2.charAt).toEqual(1);

    const result3 = sentenceAtCharLocation(textNode, 17);
    expect(result3.text).toEqual("そして最後の文章。");
    expect(result3.charAt).toEqual(3);
  });

  test("across inline elements", () => {
    const sentence = "読書は楽しい活動である。";
    const container = prepareHTML(
      `<p><b>読書</b>は<i><b>楽しい</b>活動</i>である。</p>`
    );
    const textNode = selectTextNode(container, "i b");
    const result = sentenceAtCharLocation(textNode, 1);
    expect(result.text).toEqual(sentence);
    expect(result.charAt).toEqual(sentence.indexOf("し"));
  });

  test("Ignore ruby", () => {
    const sentence = "読書は楽しい活動である。";
    const container = prepareHTML(
      `<p><ruby>読書<rt>どくしょ</rt></ruby>は<ruby>楽<rp>(</rp><rt>たの</rt><rp>)</rp></ruby>しい<ruby>活動<rt>かつどう</rt></ruby>である。</p>`
    );
    const textNode = selectTextNode(container, "ruby:nth-of-type(1)");
    const result = sentenceAtCharLocation(textNode, 1);
    expect(result.text).toEqual(sentence);
    expect(result.charAt).toEqual(1);

    const textNode2 = selectTextNode(container, "ruby:nth-of-type(2)");
    const result2 = sentenceAtCharLocation(textNode2, 0);
    expect(result2.text).toEqual(sentence);
    expect(result2.charAt).toEqual(3);
  });

  test("<br> separated sentences", () => {
    const sentence = "これは文章2";
    const container = prepareHTML(
      `<div>これは文章1<br>これは文章2<br>これは文章3</div>`
    );
    const textNode = selectTextNode(container, "div", 2);
    const result = sentenceAtCharLocation(textNode, 1);
    expect(result.text).toEqual(sentence);
    expect(result.charAt).toEqual(1);
  });
});

describe("nodesOfToken", () => {
  test("single sentence", () => {
    // [読(み)切り]はすごい。
    const container = prepareHTML(`<p>読み切りはすごい。</p>`);
    const textNode = selectTextNode(container, "p");
    const nodes = nodesOfToken(textNode, 1, "読み切り".length, 1);
    expect(nodesText(nodes)).toEqual("読み切り");
  });

  test("across inline elements", () => {
    // "読書は[(楽)しい]活動である。"
    const container = prepareHTML(
      `<p>読書は<i><b>楽</b><u>し</u></i>い活動である。</p>`
    );
    const textNode = selectTextNode(container, "i b");
    const nodes = nodesOfToken(textNode, 0, "楽しい".length, 0);
    expect(nodesText(nodes)).toEqual("楽しい");
  });

  test("ignore ruby", () => {
    // 読書は[(楽)しい]活動である。
    const container = prepareHTML(
      `<p>読書は<ruby>楽<rp>(</rp><rt>たの</rt><rp>)</rp></ruby>しい活動である。</p>`
    );
    const textNode = selectTextNode(container, "ruby");
    const nodes = nodesOfToken(textNode, 0, "楽しい".length, 0);
    expect(nodesText(nodes)).toEqual("楽しい");

    // 読書は[楽し(い)]活動である。
    const textNode2 = selectTextNode(container, "p", 2);
    const nodes2 = nodesOfToken(textNode2, 1, "楽しい".length, 2);
    expect(nodesText(nodes2)).toEqual("楽しい");
  });
});

function prepareHTML(html: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

/** select the idx's (first by default) child node of selector element as Text. */
function selectTextNode(
  element: Element,
  selector: string,
  idx: number = 0
): Text {
  const elem = element.querySelector(selector) as Element;
  const node = elem.childNodes[idx];
  if (node.nodeType !== Node.TEXT_NODE) {
    throw new Error("First child node is not Text");
  }
  return node as Text;
}

function nodesText(nodes: Node[]): string {
  return nodes.map((n) => n.textContent).join("");
}
