import { Platform } from "#platform";
import Config from "lib/config";
import { YomikiriError } from "lib/error";
import { Toast } from "lib/toast";

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
export function platformClass(attached: HTMLElement) {
  const node = attached.ownerDocument.documentElement;
  if (!node) return;
  if (Platform.IS_DESKTOP) {
    node.classList.add("desktop");
  }
  if (Platform.IS_IOS) {
    node.classList.add("ios");
  }
  if (Platform.IS_IOSAPP) {
    node.classList.add("iosapp");
  }

  if (Platform.IS_IOS || Platform.IS_IOSAPP) {
    attached.ownerDocument.body.addEventListener("touchstart", () => {
      return;
    });
  }
}

export function setStyle(attached: HTMLElement) {
  const el = attached.ownerDocument.documentElement;
  void Config.instance.get().then((config) => {
    config.setUpdatedStyle(el);
  });
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
