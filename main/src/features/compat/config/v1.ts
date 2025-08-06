import type { StoredConfig } from "./types";
import type { Configuration_V2 } from "./v2";

export namespace Configuration_V1 {
  export interface TTSVoice {
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

  export interface Field {
    name: string;
    value: string;
  }
  export interface AnkiNote {
    deck: string;
    notetype: string;
    fields: Field[];
    tags: string;
  }

  /**
   * v0.1.0 - 0.1.3
   * In these versions, 'config_version' did not exist yet.
   */
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
    config_version?: undefined;
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
