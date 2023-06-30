import { Api } from "./api";
import Config from "./config";

export namespace Theme {
  export async function insertStyleElement(document: Document) {
    const css = await generateCss();
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  export async function generateCss(): Promise<string> {
    const fontSize = await Config.get("general.font_size");
    const font = await Config.get("general.font");
    const escapedFont = font.replace('"', '\\"');

    return `
body {
  font-size: ${fontSize}px;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; 
}

.g-japanese-font {
  font-family: "${escapedFont}", "メイリオ", "Meiryo", "ヒラギノ角ゴ ProN W3", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP";
}
`;
  }
}
