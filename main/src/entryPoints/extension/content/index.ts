import Utils, { exposeGlobals } from "@/lib/utils";
import { handleClick, handleMouseMove } from "./handlers";
import { highlighter, lazyTooltip } from "./shared";
import { TOOLTIP_IFRAME_ID } from "consts";
import { Platform } from "#platform";
import { Backend } from "#platform/backend";
import { Config } from "@/lib/config";

declare global {
  interface Window {
    alreadyExecuted?: true;
  }
}

maybeInitialize();

function maybeInitialize() {
  // yomikiri tooltip iframe
  if (window.frameElement?.id === TOOLTIP_IFRAME_ID) {
    return;
  }

  // Do not re-execute content script
  // when browser.runtime.reload() is called
  if (window.alreadyExecuted) return;
  window.alreadyExecuted = true;

  initialize();
}

function initialize() {
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("click", handleClick);

  exposeGlobals({
    Platform,
    Utils,
    Backend,
    config: Config.instance,
    highlighter,
    tooltip: lazyTooltip,
  });
}
