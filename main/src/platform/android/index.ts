import {
  migrateConfigObject,
  type StoredCompatConfiguration,
} from "@/lib/compat";
import type {
  IPlatform,
  TranslateResult,
  TTSRequest,
  TTSVoice,
  VersionInfo,
} from "../common";
import type { StoredConfiguration } from "@/lib/config";
import { getTranslation } from "#platform/translate";

export * from "../common";

export namespace AndroidPlatform {
  export const IS_DESKTOP = false;
  export const IS_IOS = false;
  export const IS_IOSAPP = false;
  export const IS_ANDROID = true;

  /** TODO */
  export async function getConfig(): Promise<StoredCompatConfiguration> {
    await Promise.resolve();
    return {};
  }

  /** TODO */
  export function subscribeConfig(
    _subscriber: (config: StoredConfiguration) => void,
  ): void {}

  /** TODO */
  export async function migrateConfig(): Promise<StoredConfiguration> {
    await Promise.resolve();
    return migrateConfigObject({});
  }

  export async function saveConfig(_config: StoredConfiguration) {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  export function openOptionsPage(): void {
    throw new Error("Unimplemented");
  }

  export async function versionInfo(): Promise<VersionInfo> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  export async function japaneseTTSVoices(): Promise<TTSVoice[]> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  export async function playTTS(_req: TTSRequest): Promise<void> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  export async function translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }

  export function openExternalLink(_url: string): void {
    throw new Error("Unimplemented");
  }
}

AndroidPlatform satisfies IPlatform;
export const Platform = AndroidPlatform;
export const PagePlatform = AndroidPlatform;
