import Utils, { exposeGlobals } from "@/features/utils";
import { TOOLTIP_IFRAME_ID } from "@/consts";
import { Platform } from "#platform";
import { Backend } from "#platform/backend";
import { Config } from "@/features/config";
import { ContentScriptController } from "@/features/content";

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
  exposeGlobals({
    Platform,
    Utils,
    Backend,
    config: Config.instance,
    contentScriptController: ContentScriptController,
  });

  return new ContentScriptController();
}
