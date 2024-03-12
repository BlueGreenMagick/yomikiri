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
  hasTTS: () => boolean;
  playTTS: (text: string) => Promise<void>;
  translate: (text: string) => Promise<TranslateResult>;
}

export interface VersionInfo {
  version: string
}