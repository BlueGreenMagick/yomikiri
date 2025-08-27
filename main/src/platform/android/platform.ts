import { migrateConfigObject } from "@/features/compat";
import type { StoredConfigurationV1 } from "@/features/compat/types/typesV1";
import type { StoredConfig } from "@/features/config";
import type { UserMigrateRequest, UserMigrateState } from "@yomikiri/backend-uniffi-bindings";
import { getTranslation } from "../shared/translate";
import type { IPlatform, TranslateResult, TTSRequest, TTSVoice, VersionInfo } from "../types";
import { invokeApp, sendMessage } from "./messaging";

export class AndroidPlatform implements IPlatform {
  readonly type = "android";

  async getConfig(): Promise<StoredConfigurationV1> {
    const result = await invokeApp({ type: "GetConfig", args: null });
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
    await invokeApp({ type: "SetConfig", args: JSON.stringify(config) });
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

  async userMigrateStep(args: UserMigrateRequest): Promise<UserMigrateState> {
    return await invokeApp({ type: "UserMigrateStep", args });
  }
}
