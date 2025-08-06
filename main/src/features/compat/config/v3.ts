export namespace Configuration_V3 {
  export interface AnkiTemplate {
    deck: string;
    notetype: string;
    tags: string;
    fields: AnkiTemplateField[];
  }

  interface FieldBase<C extends keyof AnkiTemplateFieldTypes> {
    name: string;
    content: C;
  }

  export interface AnkiTemplateFieldTypes {
    "": FieldBase<"">;
    word: FieldBase<"word"> & AnkiTemplateFieldWordOptions;
    sentence: FieldBase<"sentence"> & AnkiTemplateFieldSentenceOptions;
    "translated-sentence": FieldBase<"translated-sentence">;
    meaning: FieldBase<"meaning"> & AnkiTemplateFieldMeaningOptions;
    url: FieldBase<"url">;
    link: FieldBase<"link">;
  }

  export type AnkiTemplateField = AnkiTemplateFieldTypes[keyof AnkiTemplateFieldTypes];

  /* Field Options */
  export interface AnkiTemplateFieldWordOptions {
    form: "as-is" | "dict-form" | "main-dict-form";
    style: "basic" | "furigana-anki" | "furigana-html" | "kana-only";
  }

  export interface AnkiTemplateFieldSentenceOptions {
    word: "none" | "cloze" | "bold" | "span";
    style: "basic" | "furigana-anki" | "furigana-html" | "kana-only";
  }

  export interface AnkiTemplateFieldMeaningOptions {
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

  export interface Configuration {
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
    "anki.anki_template": AnkiTemplate | null;
    "anki.enabled": boolean;
    /** Defer adding notes if Anki cannot be connected. */
    "anki.defer_notes": boolean;
    /** On ios, if auto redirect back to safari */
    "anki.ios_auto_redirect": boolean;
    /** set to null if voice is not available */
    "tts.voice": TTSVoice | null;
    /** Yomikiri semantic version on last config save */
    version: string;
    config_version: 3;
  }
}
