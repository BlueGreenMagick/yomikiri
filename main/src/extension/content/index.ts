import Utils, { exposeGlobals } from "lib/utils";
import { handleClick, handleMouseMove } from "./handlers";
import {
  browserApi,
  highlighter,
  lazyBackend,
  lazyConfig,
  lazyTooltip,
  platform,
} from "./shared";

declare global {
  interface Window {
    alreadyExecuted?: true;
  }
}

maybeInitialize();

function maybeInitialize() {
  // yomikiri tooltip iframe
  if (document.documentElement.classList.contains("yomikiri")) {
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
    platform,
    browserApi,
    Utils,
    backend: () => {
      return lazyBackend.get();
    },
    config: () => {
      void lazyConfig.get();
      return lazyConfig.getIfInitialized();
    },
    highlighter,
    tooltip: () => {
      void lazyTooltip.get();
      return lazyTooltip.getIfInitialized();
    },
  });
}
