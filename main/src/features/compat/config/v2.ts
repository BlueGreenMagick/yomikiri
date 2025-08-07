import type { StoredConfig } from "./types";
import type { Configuration_V1 } from "./v1";

export namespace Configuration_V2 {
  export type TTSVoice = Configuration_V1.TTSVoice;
  export type AnkiNote = Configuration_V1.AnkiNote;

  /** v0.2.0-dev ~ v0.2.0-dev */
  export interface Configuration {
    "state.enabled": boolean;
    "general.font_size": number;
    "general.font": string;
    "anki.connect_port": number;
    "anki.connect_url": string;
    "anki.enabled": boolean;
    "anki.ios_auto_redirect": boolean;
    "tts.voice": TTSVoice | null;
    version: string;
    "anki.template": AnkiNote | null;
    config_version: 2;
  }
}

export function migrateConfiguration_1(
  config: StoredConfig<Configuration_V1.Configuration>,
): StoredConfig<Configuration_V2.Configuration> {
  return {
    ...config,
    config_version: 2,
  };
}
