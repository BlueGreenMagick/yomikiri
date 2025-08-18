import type {
  AnkiNote,
  AnkiTemplate,
  AnkiTemplateField,
  AnkiTemplateFieldContent,
  AnkiTemplateFieldMeaningOptions,
  AnkiTemplateFieldSentenceOptions,
  AnkiTemplateFieldTypes,
  AnkiTemplateFieldWordOptions,
  Field,
} from "@/features/anki";
import type { Configuration } from "@/features/config";

export type ConfigurationV3 = Configuration;
export type AnkiTemplateV3 = AnkiTemplate;
export type AnkiNoteV3 = AnkiNote;
export type AnkiTemplateFieldV3 = AnkiTemplateField;
export type FieldV3 = Field;

export type AnkiTemplateFieldTypesV3 = AnkiTemplateFieldTypes;
export type AnkiTemplateFieldContentV3 = AnkiTemplateFieldContent;
export type AnkiTemplateFieldWordOptionsV3 = AnkiTemplateFieldWordOptions;
export type AnkiTemplateFieldSentenceOptionsV3 = AnkiTemplateFieldSentenceOptions;
export type AnkiTemplateFieldMeaningOptionsV3 = AnkiTemplateFieldMeaningOptions;
