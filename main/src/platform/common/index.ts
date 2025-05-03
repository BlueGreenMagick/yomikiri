import type { StoredConfiguration } from "@/lib/config";
import type { TranslateResult } from "./translate";
import type { Platform as DesktopPlatform } from "../desktop";
import type { Platform as IosPlatform } from "../ios";
import type { Platform as IosAppPlatform } from "../iosapp";
import type { PromiseOrValue } from "@/lib/utils";
import type { StoredCompatConfiguration } from "@/features/compat";

export type { TranslateResult } from "./translate";
export type { Platform as DesktopPlatform } from "../desktop";
export type { Platform as IosPlatform } from "../ios";
export type { Platform as IosAppPlatform } from "../iosapp";

export interface IPlatformConsts {
  IS_DESKTOP: boolean;
  IS_IOS: boolean;
  IS_IOSAPP: boolean;
  IS_ANDROID: boolean;
}

export interface IPlatform extends IPlatformConsts {
  getConfig(): Promise<StoredCompatConfiguration>;
  /** Triggers when config is changed (regardless of whether changed in current tab or not) */
  subscribeConfig(subscriber: (config: StoredConfiguration) => unknown): void;
  saveConfig: (config: StoredConfiguration) => Promise<void>;
  openOptionsPage: () => PromiseOrValue<void>;
  versionInfo: () => PromiseOrValue<VersionInfo>;
  japaneseTTSVoices(): Promise<TTSVoice[]>;
  playTTS(req: TTSRequest): Promise<void>;
  translate: (text: string) => Promise<TranslateResult>;
  /** Opens url in new tab */
  openExternalLink(url: string): void;
  migrateConfig(): Promise<StoredConfiguration>;
}

export interface VersionInfo {
  version: string;
}

export interface TTSVoice {
  id: string;
  name: string;
  /**
   * Higher is better.
   *
   * For desktop:
   * - remote: 100
   * - non-remote: 200
   *
   * For ios:
   * - default: 100
   * - enhanced: 200
   * - premium: 300
   */
  quality: number;
}

export interface TTSRequest {
  text: string;
  voice: TTSVoice | null;
}

export declare const Platform:
  | typeof DesktopPlatform
  | typeof IosPlatform
  | typeof IosAppPlatform;

export declare const ExtensionPlatform:
  | typeof DesktopPlatform
  | typeof IosPlatform;

/** Platform accessed from options page */
export declare const PagePlatform:
  | typeof DesktopPlatform
  | typeof IosAppPlatform;
