import { YomikiriError } from "@/features/error";
import { Toast } from "@/features/toast";
import type { AppCtx } from "../ctx";

declare global {
  interface Window {
    errorHandlersAttached?: boolean;
  }
}

/**
 * adds one of .desktop, .ios, .iosapp depending on platform to <html>
 * Should be attached to all root svelte element
 *
 * On ios/iosapp, adds an empty touchstart event handler to body
 * so that :active works as intended when hovered on
 * https://developer.mozilla.org/en-US/docs/Web/CSS/:active#browser_compatibility
 */
export function platformClass(attached: HTMLElement, ctx: AppCtx) {
  const node = attached.ownerDocument.documentElement;
  if (!node) return;
  if (ctx.platformType === "desktop") {
    node.classList.add("desktop");
  }
  if (ctx.platformType === "ios") {
    node.classList.add("ios");
  }
  if (ctx.platformType === "iosapp") {
    node.classList.add("iosapp");
  }

  if (ctx.platformType === "ios" || ctx.platformType === "iosapp") {
    attached.ownerDocument.body.addEventListener("touchstart", () => {
      return;
    });
  }
}

export function setStyle(attached: HTMLElement, ctx: AppCtx) {
  const el = attached.ownerDocument.documentElement;
  ctx.config.setUpdatedStyle(el);
}

export function handleErrors(attached: HTMLElement) {
  const frameWindow = attached.ownerDocument.defaultView;
  let currWindow: Window = window;
  if (frameWindow === null) {
    showError("Could not get iframe window");
    return;
  } else {
    currWindow = frameWindow;
  }

  while (true) {
    if (!currWindow.errorHandlersAttached) {
      currWindow.addEventListener("error", (event) => {
        // Ignore cross-origin error
        if (event.error === null) return;
        showError(event.error);
      });
      currWindow.addEventListener("unhandledrejection", (event) => {
        // Cross-origin rejections do not trigger unhandledrejection
        showError(event.reason);
      });
      currWindow.errorHandlersAttached = true;
    }
    if (currWindow === window || currWindow.parent == currWindow) {
      break;
    }
    currWindow = currWindow.parent;
  }
}

function showError(err: unknown) {
  const error = YomikiriError.from(err);
  console.error(error);
  Toast.yomikiriError(error);
}
