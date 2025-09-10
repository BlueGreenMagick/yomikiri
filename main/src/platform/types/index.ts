import type { StoredConfigurationV1 } from "@/features/compat";
import type { StoredConfig } from "@/features/config";
import type { PromiseOrValue } from "@/features/utils";
import type { UserMigrateRequest, UserMigrateState } from "@yomikiri/backend-uniffi-bindings";
import type { AndroidPlatform } from "../android";
import type { DesktopPlatform } from "../desktop";
import type { IosPlatform } from "../ios";
import type { IosAppPlatform } from "../iosapp";
import type { TranslateResult } from "../shared/translate";

export type { TranslateResult } from "../shared/translate";

export interface IPlatformConsts {
  readonly type: "desktop" | "ios" | "iosapp" | "android";
}

export interface IPlatform extends IPlatformConsts {
  getConfig(): Promise<StoredConfigurationV1>;
  /** Triggers when config is changed (regardless of whether changed in current tab or not) */
  subscribeConfig(subscriber: (config: StoredConfig) => unknown): void;
  saveConfig: (config: StoredConfig) => Promise<void>;
  openOptionsPage: () => PromiseOrValue<void>;
  versionInfo: () => PromiseOrValue<VersionInfo>;
  japaneseTTSVoices(): Promise<TTSVoice[]>;
  playTTS(req: TTSRequest): Promise<void>;
  translate: (text: string) => Promise<TranslateResult>;
  /** Opens url in new tab */
  openExternalLink(url: string): void;
  migrateConfig(): Promise<StoredConfig>;

  userMigrateStep(args: UserMigrateRequest): Promise<UserMigrateState>;
  finishMigration(): Promise<void>;
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

export type AnyPlatform =
  | DesktopPlatform
  | IosPlatform
  | IosAppPlatform
  | AndroidPlatform;
