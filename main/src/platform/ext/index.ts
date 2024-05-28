/**
 * For code only used in web extensions (desktop / ios)
 */

import type { DesktopPlatform, IosPlatform } from "../common";

export type * from "../common";

export declare const Platform: typeof DesktopPlatform | typeof IosPlatform;
export type Platform = DesktopPlatform | IosPlatform;
