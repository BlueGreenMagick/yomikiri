import { migrateConfigObject } from "@/features/compat";
import type { StoredConfig } from "@/features/config";
import { getStorage, setStorage, speakJapanese } from "@/features/extension";
import { LazyAsync } from "@/features/utils";
import { getTranslation } from "@/platform/shared/translate";
import type { TranslateResult, TTSRequest } from "@/platform/types";

export class DesktopPlatformPage {
  // config migration is done only once even if requested multiple times
  private readonly configMigration = new LazyAsync<StoredConfig>(
    async () => {
      return await this.migrateConfigInner();
    },
  );

  async playTTS({ text, voice }: TTSRequest): Promise<void> {
    await speakJapanese(text, voice);
  }

  translate(text: string): Promise<TranslateResult> {
    return getTranslation(text);
  }

  migrateConfig(): Promise<StoredConfig> {
    return this.configMigration.get();
  }

  async migrateConfigInner(): Promise<StoredConfig> {
    const configObject = await getStorage("config", {});
    const migrated = migrateConfigObject(configObject);
    await setStorage("config", migrated);
    return migrated;
  }
}
