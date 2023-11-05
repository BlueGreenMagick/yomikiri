<script lang="ts">
  import type { Field } from "~/ankiNoteBuilder";
  import AnkiPreviewField from "./NotePreviewField.svelte";

  export let fields: Field[];
</script>

<div class="anki-preview">
  <div class="field-container">
    {#each fields as field}
      <AnkiPreviewField {field} />
    {/each}
  </div>
</div>

<style>
  .anki-preview {
    background-color: var(--background-alt);
  }
</style>
