import { TOOLTIP_IFRAME_ID } from "@/consts";
import { ContentScriptController } from "@/features/content";

function initialize() {
  // don't run inside yomikiri tooltip iframe
  if (window.frameElement?.id === TOOLTIP_IFRAME_ID) {
    return;
  }

  const _controller = new ContentScriptController();
}

initialize();
