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

export interface AnkiTemplateV1 {
  deck: string;
  notetype: string;
  tags: string;
  fields: AnkiTemplateFieldV1[];
}

interface FieldBase<C extends keyof AnkiTemplateFieldTypesV1> {
  name: string;
  content: C;
}

export type AnkiTemplateFieldContentV1 = keyof AnkiTemplateFieldTypesV1;

export interface AnkiTemplateFieldTypesV1 {
  "": FieldBase<"">;
  word: FieldBase<"word"> & AnkiTemplateFieldWordOptionsV1;
  sentence: FieldBase<"sentence"> & AnkiTemplateFieldSentenceOptionsV1;
  "translated-sentence": FieldBase<"translated-sentence">;
  meaning: FieldBase<"meaning"> & AnkiTemplateFieldMeaningOptionsV1;
  url: FieldBase<"url">;
  link: FieldBase<"link">;
}

export type AnkiTemplateFieldV1 = AnkiTemplateFieldTypesV1[keyof AnkiTemplateFieldTypesV1];

/* Field Options */
export interface AnkiTemplateFieldWordOptionsV1 {
  form: "as-is" | "dict-form" | "main-dict-form";
  style: "basic" | "furigana-anki" | "furigana-html" | "kana-only";
}

export interface AnkiTemplateFieldSentenceOptionsV1 {
  word: "none" | "cloze" | "bold" | "span";
  style: "basic" | "furigana-anki" | "furigana-html" | "kana-only";
}

export interface AnkiTemplateFieldMeaningOptionsV1 {
  full_format: "numbered" | "unnumbered" | "line" | "div" | "yomichan";
  full_pos: boolean;
  /** Use the first N glossaries per meaning. 0 to set if off. */
  full_max_item: number;
  /** TODO: Use the first N meanings evenly across each pos group. 0 to set it off. */
  // Contain at least 1 meaning from each pos group, then by order
  // full_max_meaning: number
  // short_max_meaning: number

  /* Options for single selected meaning */
  single_pos: boolean;
  single_max_item: number;
}

interface ConfigurationNewV1 extends ConfigBase {
  config_version?: undefined;
  version?: undefined;
}

/**
 * v0.1.0 - 0.1.3
 * In these versions, 'config_version' did not exist yet.
 */
interface Configuration1V1 extends ConfigBase {
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

/** v0.2.0-dev ~ v0.2.0-dev */
interface Configuration2V1 extends Omit<Configuration1V1, "config_version"> {
  config_version: 2;
}

/** v0.2.0 ~ v0.3.5 */
interface Configuration3V1 extends ConfigBase {
  "state.enabled": boolean;
  /** Only for desktop */
  "state.anki.deferred_note_count": number;
  /** Only for desktop */
  "state.anki.deferred_note_error": boolean;
  "general.font_size": number;
  "general.font": string;
  "general.tooltip_max_height": number;
  "anki.connect_port": number;
  "anki.connect_url": string;
  "anki.anki_template": AnkiTemplateV1 | null;
  "anki.enabled": boolean;
  /** Defer adding notes if Anki cannot be connected. */
  "anki.defer_notes": boolean;
  /** On ios, if auto redirect back to safari */
  "anki.ios_auto_redirect": boolean;
  /** set to null if voice is not available */
  "tts.voice": TTSVoiceV1 | null;
  /** Yomikiri semantic version on last config save */
  version: string;
  config_version: 3;
}

interface ConfigBase {
  config_version?: number | undefined;
  version?: string | undefined;
}

type StoredConfig<C extends ConfigBase> =
  & Partial<C>
  & Pick<C, "config_version" | "version">;

interface Configurations {
  0: ConfigurationNewV1;
  1: Configuration1V1;
  2: Configuration2V1;
  3: Configuration3V1;
}

export type StoredConfiguration1V1 = StoredConfig<Configuration1V1>;
export type StoredConfiguration2V1 = StoredConfig<Configuration2V1>;
export type StoredConfiguration3V1 = StoredConfig<Configuration3V1>;

export type ConfigurationV1 = Configurations[keyof Configurations];
export type StoredConfigurationV1 = {
  [K in keyof Configurations]: StoredConfig<Configurations[K]>;
}[keyof Configurations];
