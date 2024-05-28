import type { Backend as DesktopBackend } from "../desktop/backend";
import type { Backend as IosBackend } from "../ios/backend";

export * from "../common/backend";

export declare const Backend: DesktopBackend | IosBackend;
export type Backend = DesktopBackend | IosBackend;
