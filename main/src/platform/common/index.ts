import type { StoredConfiguration } from "~/config";
import type { TranslateResult } from "./translate";

export type { TranslateResult } from "./translate";

export interface Module {
  IS_DESKTOP: boolean;
  IS_IOS: boolean;
  IS_IOSAPP: boolean;

  /** Api must be initialized */
  initialize: () => void;
  getConfig(): Promise<StoredConfiguration>;
  subscribeConfig(subscriber: (config: StoredConfiguration) => any): void;
  saveConfig: (config: StoredConfiguration) => Promise<void>;
  openOptionsPage: () => void | Promise<void>;
  versionInfo: () => Promise<VersionInfo>;
  japaneseTTSVoices(): Promise<TTSVoice[]>;
  playTTS(text: string): Promise<void>;
  translate: (text: string) => Promise<TranslateResult>;
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