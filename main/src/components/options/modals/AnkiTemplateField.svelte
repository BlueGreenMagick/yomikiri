<script lang="ts">
  import { ANKI_TEMPLATE_FIELD_TYPES, type AnyFieldTemplate } from "lib/anki";
  import AnkiTemplateFieldOptions from "./AnkiTemplateFieldOptions.svelte";
  import Select from "components/Select.svelte";

  export let fieldTemplate: AnyFieldTemplate;

  let previewHidden = true;
  let optionsHidden = true;

  if (fieldTemplate.type === "word") {
    fieldTemplate.options;
  }
</script>

<div class="field-item">
  <div class="field-name">{fieldTemplate.field}</div>
  <div class="field-row">
    <Select
      options={ANKI_TEMPLATE_FIELD_TYPES}
      bind:selected={fieldTemplate.type}
    />
  </div>
  <div class="field-preview" class:hidden={previewHidden}></div>
  <div class="field-options" class:hidden={optionsHidden}>
    <AnkiTemplateFieldOptions template={fieldTemplate} />
  </div>
</div>

<style>
  .field-name {
    font-size: 1em;
  }
  .field-row > :global(select) {
    width: 100%;
    height: 1.6em;
    font-size: 1em;
    padding: 0px 2px;
  }
</style>
