import Utils, { exposeGlobals } from "@/features/utils";
import { TOOLTIP_IFRAME_ID } from "@/consts";
import { Platform, type DesktopPlatform, type IosPlatform } from "#platform";
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
  const platform = Platform as DesktopPlatform | IosPlatform;
  exposeGlobals({
    Platform,
    Utils,
    config: Config.instance,
    contentScriptController: ContentScriptController,
  });

  return new ContentScriptController(platform, Config.instance);
}
