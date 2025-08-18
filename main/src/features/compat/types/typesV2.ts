/** v0.2.0-dev ~ v0.2.0-dev */
export interface ConfigurationV2 {
  "state.enabled": boolean;
  "general.font_size": number;
  "general.font": string;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.enabled": boolean;
  "anki.ios_auto_redirect": boolean;
  "tts.voice": TTSVoiceV2 | null;
  version: string;
  "anki.template": AnkiNoteV2 | null;
  config_version: 2;
}

export interface FieldV2 {
  name: string;
  value: string;
}
export interface AnkiNoteV2 {
  deck: string;
  notetype: string;
  fields: FieldV2[];
  tags: string;
}

export interface TTSVoiceV2 {
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
