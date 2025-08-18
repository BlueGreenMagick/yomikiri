/**
 * v0.1.0 - 0.1.3
 * In these versions, 'config_version' did not exist yet.
 */
export interface ConfigurationV1 {
  "state.enabled": boolean;
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.enabled": boolean;
  "anki.ios_auto_redirect": boolean;
  "tts.voice": TTSVoiceV1 | null;
  version: string;
  "anki.template": AnkiNoteV1 | null;
  config_version?: undefined;
}

export interface FieldV1 {
  name: string;
  value: string;
}
export interface AnkiNoteV1 {
  deck: string;
  notetype: string;
  fields: FieldV1[];
  tags: string;
}

export interface TTSVoiceV1 {
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
