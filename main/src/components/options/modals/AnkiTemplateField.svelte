<script lang="ts">
  import {
    ANKI_TEMPLATE_FIELD_TYPES,
    ankiTemplateFieldLabel,
    type AnkiTemplateFieldType,
    type AnyFieldTemplate,
    type FieldTemplateOptionsMap,
  } from "lib/anki";
  import AnkiTemplateFieldOptions from "./AnkiTemplateFieldOptions.svelte";
  import Select from "components/Select.svelte";
  import IconEye from "@icons/eye.svg";
  import IconOptions from "@icons/options.svg";

  export let fieldTemplate: AnyFieldTemplate;

  let previewShown = false;
  let optionsShown = false;

  // fieldTemplates should not reload on type change
  // so accidentally changing type does not clear all options data
  let fieldTemplates = new Map<
    string,
    FieldTemplateOptionsMap[AnkiTemplateFieldType]
  >();

  const selectOptions = ANKI_TEMPLATE_FIELD_TYPES.map((type) => {
    const options = fieldTemplates.get(type);
    const label = ankiTemplateFieldLabel(type, options);
    return [type, label] as [AnkiTemplateFieldType, string];
  });
</script>

<div class="anki-template-field">
  <div class="field-name">{fieldTemplate.field}</div>
  <div class="field-row">
    <Select options={selectOptions} bind:selected={fieldTemplate.type} />
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
    <div class="field-preview" class:hidden={!previewShown}></div>
    <div class="field-options" class:hidden={!optionsShown}>
      <AnkiTemplateFieldOptions template={fieldTemplate} />
    </div>
  </div>
</div>

<style>
  .anki-template-field {
    background-color: white;
    margin-top: 8px;
    margin-bottom: 8px;
    padding: 6px 8px;
    border-radius: 8px;
  }

  .field-name {
    font-size: 1em;
    font-weight: bold;
    margin-bottom: 2px;
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
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px solid var(--border);
  }
</style>
