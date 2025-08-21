import { migrateConfigObject } from "@/features/compat";
import type { StoredConfigurationV1 } from "@/features/compat/types/typesV1";
import type { StoredConfig } from "@/features/config";
import type { AppCommandOf, AppCommandResultOf, AppCommandTypes } from "../shared/invokeApp";
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

  async getConfig(): Promise<StoredConfigurationV1> {
    const result = await this.invokeApp({ type: "GetConfig", args: null });
    if (result === null) {
      return {};
    } else {
      return JSON.parse(result) as StoredConfigurationV1;
    }
  }

  /** TODO */
  subscribeConfig(_subscriber: (config: StoredConfig) => void): void {}

  /** TODO */
  async migrateConfig(): Promise<StoredConfig> {
    await Promise.resolve();
    return migrateConfigObject({});
  }

  async saveConfig(config: StoredConfig): Promise<void> {
    await this.invokeApp({ type: "SetConfig", args: JSON.stringify(config) });
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

  private async invokeApp<C extends AppCommandTypes>(
    req: AppCommandOf<C>,
  ): Promise<AppCommandResultOf<C>> {
    const result = await sendMessage("invokeApp", req);
    return result as AppCommandResultOf<C>;
  }
}
