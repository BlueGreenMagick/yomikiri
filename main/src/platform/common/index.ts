import type { Config, StoredConfiguration } from "~/config";
import type { TranslateResult } from "./translate";
import type { Platform as DesktopPlatform } from "../desktop"
import type { Platform as IosPlatform } from "../ios"
import type { Platform as IosAppPlatform } from "../iosapp"
import type { Backend } from "./backend";
import type {AnkiApi} from "./anki"
import type Utils from "~/utils";

export type { TranslateResult } from "./translate";
export type { Platform as DesktopPlatform } from "../desktop"
export type { Platform as IosPlatform } from "../ios"
export type { Platform as IosAppPlatform } from "../iosapp"

export interface IPlatform {
  newBackend(): Utils.PromiseOrValue<Backend>;
  newAnkiApi(config: Config): AnkiApi;
  getConfig(): Promise<StoredConfiguration>;
  /** Triggers when config is changed (regardless of whether changed in current tab or not) */
  subscribeConfig(subscriber: (config: StoredConfiguration) => unknown): void;
  saveConfig: (config: StoredConfiguration) => Promise<void>;
  openOptionsPage: () => void | Promise<void>;
  versionInfo: () => Promise<VersionInfo>;
  japaneseTTSVoices(): Promise<TTSVoice[]>;
  playTTS(text: string): Promise<void>;
  translate: (text: string) => Promise<TranslateResult>;
  /** Opens url in new tab */
  openExternalLink(url: string): void;
}

export interface IPlatformStatic {
  IS_DESKTOP: boolean
  IS_IOS: boolean
  IS_IOSAPP: boolean
}

export interface VersionInfo {
  version: string
}

export interface TTSVoice {
  id: string,
  name: string,
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
  quality: number,
}

export interface IosTTSRequest {
  text: string,
  voice: TTSVoice | null
}

export declare const Platform: typeof DesktopPlatform | typeof IosPlatform | typeof IosAppPlatform
export type Platform = DesktopPlatform | IosPlatform | IosAppPlatform