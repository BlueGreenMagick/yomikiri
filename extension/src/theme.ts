import { Api } from "./api";
import Config from "./config";

export namespace Theme {
  let styleEl: HTMLStyleElement | undefined;

  export async function insertStyleElement(document: Document) {
    const css = await generateCss();
    if (styleEl === undefined) {
      styleEl = document.createElement("style");
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }

  export async function generateCss(): Promise<string> {
    const fontSize = Config.get("general.font_size");
    const font = Config.get("general.font");
    const escapedFont = font.replace('"', '\\"').replace("\\", "\\\\");

    return `:root {
--font-size: ${fontSize}px;
--japanese-font: "${escapedFont}";
    }`;
  }
}
