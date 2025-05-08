import Utils, { exposeGlobals } from "@/features/utils";
import { TOOLTIP_IFRAME_ID } from "@/consts";
import { Platform, type DesktopPlatform, type IosPlatform } from "#platform";
import { Config } from "@/features/config";
import { ContentScriptController } from "@/features/content";
import type { DesktopCtx, IosCtx } from "@/features/ctx";

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
  const ctx = createCtx();

  exposeGlobals({
    Platform,
    Utils,
    config: Config.instance,
    contentScriptController: ContentScriptController,
  });

  return new ContentScriptController(ctx, Config.instance);
}

function createCtx(): DesktopCtx | IosCtx {
  const platform = Platform as DesktopPlatform | IosPlatform;
  if (platform.type === "desktop") {
    return {
      platform,
      platformType: platform.type,
    };
  } else {
    return {
      platform,
      platformType: platform.type,
    };
  }
}
