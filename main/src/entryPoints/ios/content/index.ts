import { TOOLTIP_IFRAME_ID } from "@/consts";
import { ContentScriptController } from "@/features/content";
import Utils, { exposeGlobals } from "@/features/utils";
import { createIosCtx } from "@/platform/ios";

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
  const ctx = createIosCtx();

  exposeGlobals({
    Platform: ctx.platform,
    Utils,
    config: ctx.lazyConfig,
    contentScriptController: ContentScriptController,
  });

  return new ContentScriptController(ctx);
}
