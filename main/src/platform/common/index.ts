import type { StoredConfiguration } from "~/config";
import type { TranslateResult } from "./translate";
import type { BrowserApi } from "~/extension/browserApi";

export type { TranslateResult } from "./translate";

export interface Module {
  IS_DESKTOP: boolean;
  IS_IOS: boolean;
  IS_IOSAPP: boolean;

  /** Api must be initialized */
  initialize: ((browserApi: BrowserApi) => void) | (() => void);
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