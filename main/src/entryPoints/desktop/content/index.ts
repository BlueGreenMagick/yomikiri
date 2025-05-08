import Utils, { exposeGlobals } from "@/features/utils";
import { TOOLTIP_IFRAME_ID } from "@/consts";
import { DesktopPlatform } from "@/platform/desktop";
import { Config } from "@/features/config";
import { ContentScriptController } from "@/features/content";
import type { DesktopCtx } from "@/features/ctx";

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
  const platform = DesktopPlatform;
  const ctx: DesktopCtx = {
    platform,
    platformType: platform.type,
  };

  exposeGlobals({
    Platform: DesktopPlatform,
    Utils,
    config: Config.instance,
    contentScriptController: ContentScriptController,
  });

  return new ContentScriptController(ctx, Config.instance);
}
