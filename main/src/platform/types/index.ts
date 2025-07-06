import type { StoredCompatConfiguration } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import type { PromiseOrValue } from "@/features/utils";
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

  /** value is null if key doesn't exist in storage */
  getStorageBatch(keys: string[]): Promise<Record<string, unknown>>;
  /**
   * If value is `null` or `undefined`, deletes from storage.
   */
  setStorageBatch(valueMap: Record<string, unknown>): Promise<void>;
  /** Returns null if key doesn't exist in storage */
  getStorage(key: string): Promise<unknown>;
  /**
   * If value is `null` or `undefined`, deletes from storage.
   */
  setStorage(key: string, value: unknown): Promise<void>;
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

export type JSONStorageValues = { [key: string]: string | null };

export type AnyPlatform =
  | DesktopPlatform
  | IosPlatform
  | IosAppPlatform
  | AndroidPlatform;
