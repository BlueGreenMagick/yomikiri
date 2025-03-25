<script lang="ts">
  import IconEye from "#icons/eye.svg";
  import IconOptions from "#icons/options.svg";
  import {
    type AnkiTemplateFieldContent,
    ANKI_TEMPLATE_FIELD_TYPES,
    ankiTemplateFieldLabel,
    newAnkiTemplateField,
    type Field,
    type LoadingField,
    buildAnkiField,
    type AnkiTemplateField,
  } from "@/lib/anki";

  import Select from "@/components/Select.svelte";
  import NoteFieldEditor from "@/components/anki/NoteFieldEditor.svelte";
  import IconedButton from "@/components/IconedButton.svelte";
  import AnkiTemplateFieldOptionsEdit from "./AnkiTemplateFieldOptionsEdit.svelte";
  import { exampleMarkerData } from "./exampleMarkerData";
  import Config from "@/lib/config";

  const config = Config.using();
  export let fieldTemplate: AnkiTemplateField;

  let content: AnkiTemplateFieldContent;

  let previewShown = false;
  let optionsShown = false;
  let selectOptions: [AnkiTemplateFieldContent, string][];
  let previewField: LoadingField | Field;
  // fieldTemplates should not reload on type change
  // so accidentally changing type does not clear all options data
  let fieldTemplates = new Map<string, AnkiTemplateField>();

  function generateFieldOptions(): [AnkiTemplateFieldContent, string][] {
    return ANKI_TEMPLATE_FIELD_TYPES.map((type) => {
      const cached =
        fieldTemplates.get(type) ??
        newAnkiTemplateField(fieldTemplate.name, type);
      const label = ankiTemplateFieldLabel(cached);
      return [type, label] as [AnkiTemplateFieldContent, string];
    });
  }

  function createPreviewField(): LoadingField | Field {
    const ctx = { config };
    return buildAnkiField(ctx, exampleMarkerData, fieldTemplate);
  }

  function onTypeChange(_ev: unknown) {
    const cached = fieldTemplates.get(content);
    if (cached === undefined) {
      fieldTemplate = newAnkiTemplateField(fieldTemplate.name, content);
    } else {
      fieldTemplate = cached;
    }
  }

  function onFieldTemplateChange(_: unknown) {
    fieldTemplates.set(content, fieldTemplate);
    content = fieldTemplate.content;
    selectOptions = generateFieldOptions();
    previewField = createPreviewField();
  }

  $: onFieldTemplateChange(fieldTemplate);
</script>

<div class="anki-template-field">
  <div class="inner">
    <div class="field-name">{fieldTemplate.name}</div>
    <div class="field-row">
      <Select
        options={selectOptions}
        bind:selected={content}
        on:change={onTypeChange}
      />
      <div class="buttons">
        <IconedButton
          active={previewShown}
          on:click={() => {
            previewShown = !previewShown;
            optionsShown = false;
          }}
        >
          <IconEye />
        </IconedButton>
        <IconedButton
          active={optionsShown}
          on:click={() => {
            optionsShown = !optionsShown;
            previewShown = false;
          }}
        >
          <IconOptions />
        </IconedButton>
      </div>
    </div>
    <div class="section" class:hidden={!previewShown && !optionsShown}>
      <div class="field-preview" class:hidden={!previewShown}>
        <NoteFieldEditor readonly field={previewField} />
      </div>
      <div class="field-options" class:hidden={!optionsShown}>
        <AnkiTemplateFieldOptionsEdit bind:template={fieldTemplate} />
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
    font-size: 1rem;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .hidden {
    display: none;
  }

  .field-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .field-row > :global(select) {
    width: 100%;
    height: 1.6em;
    font-size: 1rem;
    padding: 0px 2px;
  }

  .buttons {
    display: flex;
    align-items: center;
  }

  .section {
    margin-top: 12px;
    padding-top: 4px;
    border-top: 1px solid var(--border);
  }

  .field-preview {
    margin: 6px 0;
  }
</style>
