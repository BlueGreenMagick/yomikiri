<script lang="ts">
  import { ANKI_TEMPLATE_FIELD_TYPES, type AnyFieldTemplate } from "lib/anki";
  import AnkiTemplateFieldOptions from "./AnkiTemplateFieldOptions.svelte";
  import Select from "components/Select.svelte";
  import IconEye from "@icons/eye.svg";
  import IconOptions from "@icons/options.svg";

  export let fieldTemplate: AnyFieldTemplate;

  let previewShown = false;
  let optionsShown = false;

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
  <div class="field-preview" class:hidden={!previewShown}></div>
  <div class="field-options" class:hidden={!optionsShown}>
    <AnkiTemplateFieldOptions template={fieldTemplate} />
  </div>
</div>

<style>
  .field-name {
    font-size: 1em;
  }

  .field-row {
    display: flex;
    align-items: center;
  }

  .hidden {
    display: none;
  }

  .field-row > :global(select) {
    width: 100%;
    height: 1.6em;
    font-size: 1em;
    padding: 0px 2px;
    margin-right: 0.3em;
  }

  .icon {
    flex: 0 0 auto;
    width: 2em;
    height: 2em;
    padding: 0.3em;
    fill: var(--button-light);
  }

  .icon.active {
    fill: var(--text);
  }
</style>
