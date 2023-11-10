<script lang="ts">
  import type { Field } from "~/ankiNoteBuilder";

  export let field: Field;
  export let bold: boolean = false;
</script>

<div class="anki-preview-field">
  <div class="field-name" class:bold>{field.name}</div>
  <div
    class="field-value"
    contenteditable="true"
    bind:innerHTML={field.value}
  />
</div>

<style>
  .anki-preview-field {
    width: 100%;
    margin-top: 4px;
  }
  .bold {
    font-weight: bold;
  }

  .field-value {
    width: 100%;
    max-height: 5em;
    overflow-y: auto;
    border: 1px solid black;
    background-color: var(--background);
    padding: 2px;
  }
</style>
