import {
  migrateConfigObject,
  type StoredCompatConfiguration,
} from "@/features/compat";
import type {
  IPlatform,
  TranslateResult,
  TTSRequest,
  TTSVoice,
  VersionInfo,
} from "../types";
import type { StoredConfiguration } from "@/features/config";
import { getTranslation } from "../shared/translate";
import { sendMessage } from "./messaging";

export class AndroidPlatform implements IPlatform {
  readonly type = "android";
  /** TODO */
  async getConfig(): Promise<StoredCompatConfiguration> {
    return await sendMessage("loadConfig", null);
  }

  /** TODO */
  subscribeConfig(_subscriber: (config: StoredConfiguration) => void): void {}

  /** TODO */
  async migrateConfig(): Promise<StoredConfiguration> {
    await Promise.resolve();
    return migrateConfigObject({});
  }

  async saveConfig(config: StoredConfiguration): Promise<void> {
    await sendMessage("saveConfig", config);
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
