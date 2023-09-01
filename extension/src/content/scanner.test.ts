import { test, expect, describe, beforeAll } from "@jest/globals";
import { Scanner } from "./scanner";

beforeAll(() => {
  const styles = document.createElement("style");
  styles.innerHTML = `
* {
  display: block;
  position: static;
}
b, i, u, ruby, rb {
  display: inline;
}
rp {
  display: none;
}
`;

  document.head.appendChild(styles);
});

describe("Scan sentence", () => {
  test("single sentence", () => {
    const container = prepareHTML(`<p>読み切りはすごい。</p>`);
    const textNode = selectTextNode(container, "p");

    const result = Scanner.sentenceAtCharacterLocation(textNode, 0);
    expect(result.curr).toEqual("読み切りはすごい。");
    expect(result.stStartIdx).toEqual(undefined);
    expect(result.prev).toEqual("");
    expect(result.stEndIdx).toEqual(9);
    expect(result.next).toEqual(undefined);
  });

  test("multiple sentences", () => {
    const container = prepareHTML(
      `<p>これは文章1。これは文章2。そして最後の文章。</p>`
    );
    const textNode = selectTextNode(container, "p");

    const result = Scanner.sentenceAtCharacterLocation(textNode, 4);
    expect(result.curr).toEqual("これは文章1。");
    expect(result.prev).toEqual("");
    expect(result.stEndIdx).toEqual(7);
    const result2 = Scanner.sentenceAtCharacterLocation(textNode, 8);
    expect(result2.curr).toEqual("これは文章2。");
    expect(result2.stStartIdx).toEqual(7);
    expect(result2.stEndIdx).toEqual(14);
    const result3 = Scanner.sentenceAtCharacterLocation(textNode, 14);
    expect(result3.curr).toEqual("そして最後の文章。");
    expect(result3.stStartIdx).toEqual(14);
    expect(result3.stEndIdx).toEqual(23);
  });

  test("across inline elements", () => {
    const container = prepareHTML(
      `<p><b>読書</b>は<i><b>楽しい</b>活動</i>である。</p>`
    );
    const textNode = selectTextNode(container, "i b");
    const result = Scanner.sentenceAtCharacterLocation(textNode, 1);
    expect(result.curr).toEqual("楽しい");
    expect(result.prev).toEqual("読書は");
    expect(result.next).toEqual("活動である。");
  });

  test("Ignore ruby", () => {
    const container = prepareHTML(
      `<p><ruby>読書<rt>どくしょ</rt></ruby>は<ruby>楽<rp>(</rp><rt>たの</rt><rp>)</rp></ruby>しい<ruby>活動<rt>かつどう</rt></ruby>である。</p>`
    );
    const textNode = selectTextNode(container, "ruby:nth-of-type(1)");
    const result = Scanner.sentenceAtCharacterLocation(textNode, 1);
    expect(result.curr).toEqual("読書");
    expect(result.prev).toEqual("");
    expect(result.next).toEqual("は楽しい活動である。");

    const textNode2 = selectTextNode(container, "ruby:nth-of-type(2)");
    const result2 = Scanner.sentenceAtCharacterLocation(textNode2, 1);
    expect(result2.curr).toEqual("楽");
    expect(result2.prev).toEqual("読書は");
    expect(result2.next).toEqual("しい活動である。");
  });
});

function prepareHTML(html: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

/** select the first child node of selector element, and assumes it is Text */
function selectTextNode(element: Element, selector: string): Text {
  const elem = element.querySelector(selector) as Element;
  return elem.childNodes[0] as Text;
}
