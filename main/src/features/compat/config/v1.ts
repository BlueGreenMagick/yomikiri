import type { StoredConfig } from "./types";
import type { Configuration_2 } from "./v2";

export interface TTSVoice_1 {
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

export interface Field_1 {
  name: string;
  value: string;
}
interface AnkiNote_1 {
  deck: string;
  notetype: string;
  fields: Field_1[];
  tags: string;
}

/**
 * v0.1.0 - 0.1.3
 * In these versions, 'config_version' did not exist yet.
 */
export interface Configuration_1_Conf {
  "state.enabled": boolean;
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.enabled": boolean;
  "anki.ios_auto_redirect": boolean;
  "tts.voice": TTSVoice_1 | null;
  version: string;
  "anki.template": AnkiNote_1 | null;
}

export interface Configuration_1 extends Configuration_1_Conf {
  config_version?: undefined;
}

export function migrateConfiguration_1(
  config: StoredConfig<Configuration_1>,
): StoredConfig<Configuration_2> {
  return {
    ...config,
    config_version: 2,
  };
}
