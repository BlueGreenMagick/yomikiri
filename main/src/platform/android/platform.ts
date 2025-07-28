import { migrateConfigObject, type StoredCompatConfiguration } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import { getTranslation } from "../shared/translate";
import type { IPlatform, TranslateResult, TTSRequest, TTSVoice, VersionInfo } from "../types";
import { sendMessage } from "./messaging";

export class AndroidPlatform implements IPlatform {
  readonly type = "android";

  async getStoreBatch(
    keys: string[],
  ): Promise<Record<string, unknown>> {
    const result = await sendMessage("getStoreBatch", keys);

    return Object.fromEntries(
      Object.entries(result).map((
        [key, value],
      ) => [key, value === null ? null : JSON.parse(value)]),
    );
  }

  /**
   * If value is `null` or `undefined`, deletes from store.
   */
  async setStoreBatch(map: Record<string, unknown>): Promise<void> {
    const jsonMap: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(map)) {
      jsonMap[key] = value === null || value === undefined ? null : JSON.stringify(value);
    }
    await sendMessage("setStoreBatch", jsonMap);
  }

  /** Returns null if it doesn't exist */
  async getStore(key: string): Promise<unknown> {
    const result = await sendMessage("getStoreBatch", [key]);
    const value = result[key];
    if (value === null) return value;
    return JSON.parse(value);
  }

  /**
   * If value is `null` or `undefined`, deletes from store.
   *
   * Keys with value 'undefined' is ignored.
   */
  async setStore(key: string, value: unknown) {
    const jsonMap = {
      [key]: (value === null || value === undefined) ? null : JSON.stringify(value),
    };
    await sendMessage("setStoreBatch", jsonMap);
  }

  async getConfig(): Promise<StoredCompatConfiguration> {
    return await this.getStore("config") ?? {};
  }

  /** TODO */
  subscribeConfig(_subscriber: (config: StoredConfiguration) => void): void {}

  /** TODO */
  async migrateConfig(): Promise<StoredConfiguration> {
    await Promise.resolve();
    return migrateConfigObject({});
  }

  async saveConfig(config: StoredConfiguration): Promise<void> {
    await this.setStore("config", config);
  }

  openOptionsPage(): void {
    throw new Error("Unimplemented");
  }

  async versionInfo(): Promise<VersionInfo> {
    const version = await sendMessage("versionInfo", null);
    return { version };
  }

  async japaneseTTSVoices(): Promise<TTSVoice[]> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  async playTTS(_req: TTSRequest): Promise<void> {
    await Promise.resolve();
    throw new Error("Unimplemented");
  }

  async translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }

  openExternalLink(_url: string): void {
    throw new Error("Unimplemented");
  }
}
