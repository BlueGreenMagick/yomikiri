import { migrateConfigObject } from "@/features/compat";
import type { StoredConfiguration } from "@/features/config";
import { getStorage, setStorage, speakJapanese } from "@/features/extension";
import { LazyAsync } from "@/features/utils";
import { getTranslation } from "@/platform/shared/translate";
import type { TranslateResult, TTSRequest } from "@/platform/types";

export class DesktopPlatformPage {
  // config migration is done only once even if requested multiple times
  private readonly configMigration = new LazyAsync<StoredConfiguration>(
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

  migrateConfig(): Promise<StoredConfiguration> {
    return this.configMigration.get();
  }

  async migrateConfigInner(): Promise<StoredConfiguration> {
    const configObject = await getStorage("config", {});
    const migrated = migrateConfigObject(configObject);
    await setStorage("config", migrated);
    return migrated;
  }
}
