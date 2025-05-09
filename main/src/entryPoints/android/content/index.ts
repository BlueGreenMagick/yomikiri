import { TOOLTIP_IFRAME_ID } from "@/consts";
import { ContentScriptController } from "@/features/content";
import { createAndroidCtx } from "@/platform/android";

function initialize() {
  // don't run inside yomikiri tooltip iframe
  if (window.frameElement?.id === TOOLTIP_IFRAME_ID) {
    return;
  }

  const ctx = createAndroidCtx();

  const _controller = new ContentScriptController(ctx);
}

initialize();
