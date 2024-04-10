import { Platform } from "@platform";

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
    attached.ownerDocument.body.addEventListener("touchstart", () => { return })
  }
}
