<script lang="ts">
  import type { Field } from "~/ankiNoteBuilder";

  export let field: Field;
</script>

<div class="anki-preview-field">
  <div class="field-name">{field.name}</div>
  <div
    class="field-value"
    contenteditable="true"
    bind:innerHTML={field.value}
  />
</div>

<style>
  .anki-preview-field {
    width: 100%;
  }
  .field-value {
    width: 100%;
    max-height: 5em;
    overflow-y: auto;
    border: 1px solid black;
    background-color: var(--background);
  }
</style>
