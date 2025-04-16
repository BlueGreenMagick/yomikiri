import { TOOLTIP_IFRAME_ID } from "@/consts";
import { setupListeners } from "@/features/content";

function initialize() {
  // don't run inside yomikiri tooltip iframe
  if (window.frameElement?.id === TOOLTIP_IFRAME_ID) {
    return;
  }

  setupListeners();
}

initialize();
