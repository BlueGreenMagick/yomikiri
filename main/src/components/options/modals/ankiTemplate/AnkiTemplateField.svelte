<script lang="ts">
  import {
    type AnkiTemplateFieldType,
    type AnyAnkiTemplateField,
    ANKI_TEMPLATE_FIELD_TYPES,
    ankiTemplateFieldLabel,
    newAnkiTemplateField,
  } from "lib/anki";
  import AnkiTemplateFieldOptions from "./AnkiTemplateFieldOptions.svelte";
  import Select from "components/Select.svelte";
  import IconEye from "@icons/eye.svg";
  import IconOptions from "@icons/options.svg";
  import NotePreviewField from "components/anki/NoteFieldEditor.svelte";
  import {
    buildAnkiField,
    type Field,
    type LoadingField,
  } from "lib/anki/ankiNoteBuilder";
  import type { Platform } from "@platform";
  import type Config from "lib/config";
  import { exampleMarkerData } from "components/options/exampleMarkerData";

  export let platform: Platform;
  export let config: Config;
  export let fieldTemplate: AnyAnkiTemplateField;

  let type: AnkiTemplateFieldType;

  let previewShown = false;
  let optionsShown = false;
  let selectOptions: [AnkiTemplateFieldType, string][];
  let previewField: LoadingField | Field;
  // fieldTemplates should not reload on type change
  // so accidentally changing type does not clear all options data
  let fieldTemplates = new Map<string, AnyAnkiTemplateField>();

  function generateFieldOptions(_: unknown): [AnkiTemplateFieldType, string][] {
    return ANKI_TEMPLATE_FIELD_TYPES.map((type) => {
      const template = fieldTemplates.get(type);
      const label = ankiTemplateFieldLabel(type, template?.options);
      return [type, label] as [AnkiTemplateFieldType, string];
    });
  }

  function newPreviewField(_: unknown) {
    const ctx = { platform, config };
    previewField = buildAnkiField(ctx, exampleMarkerData, fieldTemplate);
  }

  function onTypeChange(_ev: unknown) {
    const cached = fieldTemplates.get(type);
    if (cached === undefined) {
      fieldTemplate = newAnkiTemplateField(fieldTemplate.field, type);
    } else {
      fieldTemplate = cached;
    }
  }

  function onFieldTemplateChange(_: unknown) {
    fieldTemplates.set(type, fieldTemplate);
    type = fieldTemplate.type;
  }

  $: onFieldTemplateChange(fieldTemplate);
  $: selectOptions = generateFieldOptions([fieldTemplate]);
  $: newPreviewField(fieldTemplate);
</script>

<div class="anki-template-field">
  <div class="inner">
    <div class="field-name">{fieldTemplate.field}</div>
    <div class="field-row">
      <Select
        options={selectOptions}
        bind:selected={type}
        on:change={onTypeChange}
      />
      <button
        class="icon"
        class:active={previewShown}
        on:click={() => {
          previewShown = !previewShown;
          optionsShown = false;
        }}
      >
        <IconEye />
      </button>
      <button
        class="icon"
        class:active={optionsShown}
        on:click={() => {
          optionsShown = !optionsShown;
          previewShown = false;
        }}
      >
        <IconOptions />
      </button>
    </div>
    <div class="section" class:hidden={!previewShown && !optionsShown}>
      <div class="field-preview" class:hidden={!previewShown}>
        <NotePreviewField readonly field={previewField} />
      </div>
      <div class="field-options" class:hidden={!optionsShown}>
        <AnkiTemplateFieldOptions bind:template={fieldTemplate} />
      </div>
    </div>
  </div>
</div>

<style>
  .anki-template-field {
    background-color: var(--background);
    margin: 8px 0;
    border-radius: 8px;
    /* disable margin collapsing */
    contain: layout;
  }

  .inner {
    margin: 8px;
  }

  .field-name {
    font-size: 1em;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .hidden {
    display: none;
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .field-row > :global(select) {
    width: 100%;
    height: 1.6em;
    font-size: 1em;
    padding: 0px 2px;
  }

  .icon {
    flex: 0 0 auto;
    width: 1.4em;
    height: 1.4em;
    fill: var(--button-light);
  }

  .icon.active {
    fill: var(--text);
  }

  .section {
    margin-top: 12px;
    padding-top: 4px;
    border-top: 1px solid var(--border);
  }
</style>
