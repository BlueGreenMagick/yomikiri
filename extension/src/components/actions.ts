import { Platform } from "@platform";

/**
 * adds one of .desktop, .ios, .iosapp depending on platform
 * Should be attached to all root svelte element
 */
export function platformClass(node: HTMLElement) {
  if (Platform.IS_DESKTOP) {
    node.classList.add("desktop");
  }
  if (Platform.IS_IOS) {
    node.classList.add("ios");
  }
  if (Platform.IS_IOSAPP) {
    node.classList.add("iosapp");
  }

  return { destroy() {} };
}
