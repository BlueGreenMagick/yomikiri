import { Platform } from "@platform";

/**
 * adds one of .desktop, .ios, .iosapp depending on platform to <html>
 * Should be attached to all root svelte element
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
}
