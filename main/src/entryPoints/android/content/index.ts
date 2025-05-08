import { TOOLTIP_IFRAME_ID } from "@/consts";
import Config from "@/features/config";
import { ContentScriptController } from "@/features/content";
import type { AndroidCtx } from "@/features/ctx";
import { AndroidPlatform } from "@/platform/android";

function initialize() {
  // don't run inside yomikiri tooltip iframe
  if (window.frameElement?.id === TOOLTIP_IFRAME_ID) {
    return;
  }

  const platform = AndroidPlatform;
  const lazyConfig = Config.instance;

  const ctx: AndroidCtx = {
    platform,
    platformType: platform.type,
  };

  const _controller = new ContentScriptController(ctx, lazyConfig);
}

initialize();
