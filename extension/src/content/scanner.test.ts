import { test, expect, describe } from "@jest/globals";
import { Scanner } from "./scanner";

describe("Scan sentence", () => {
  test("basic", () => {
    const cont = prepareHTML(`<p>読み切りはすごい。</p>`);
    const textNode = selectTextNode(cont, "p");

    const result = Scanner.sentenceAtCharacterLocation(textNode, 0);
    expect(result.curr).toEqual("読み切りはすごい。");
    expect(result.stStartIdx).toEqual(undefined);
    expect(result.prev).toEqual("");
    expect(result.stEndIdx).toEqual(9);
    expect(result.next).toEqual(undefined);
  });

  test("basic2", () => {
    const cont = prepareHTML(`<p>これは文章1。これは文章2。</p>`);
    const textNode = selectTextNode(cont, "p");

    const result = Scanner.sentenceAtCharacterLocation(textNode, 4);
    expect(result.curr).toEqual("これは文章1。");
    expect(result.prev).toEqual("");
    expect(result.stEndIdx).toEqual(7);
    const result2 = Scanner.sentenceAtCharacterLocation(textNode, 8);
    expect(result2.curr).toEqual("これは文章2。");
    expect(result2.stStartIdx).toEqual(7);
    expect(result2.stEndIdx).toEqual(14);
  });
});

function prepareHTML(html: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

function selectTextNode(element: Element, selector: string): Text {
  const elem = element.querySelector(selector) as Element;
  return elem.childNodes[0] as Text;
}
