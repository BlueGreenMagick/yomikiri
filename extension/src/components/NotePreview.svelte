<script lang="ts">
  import type { Field, LoadingField } from "~/ankiNoteBuilder";
  import AnkiPreviewField from "./NotePreviewField.svelte";

  export let fields: LoadingField[];
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
