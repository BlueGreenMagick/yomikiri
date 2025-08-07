import * as ConfigV1 from "./configv1";
import type { StoredConfig } from "./types";

export type TTSVoice = ConfigV1.TTSVoice;
export type AnkiNote = ConfigV1.AnkiNote;
export type Field = ConfigV1.Field;

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

export function migrateConfiguration_1(
  config: StoredConfig<ConfigV1.Configuration>,
): StoredConfig<Configuration> {
  return {
    ...config,
    config_version: 2,
  };
}
