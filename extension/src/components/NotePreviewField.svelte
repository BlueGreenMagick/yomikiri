<script lang="ts">
  import type { Writable } from "svelte/store";
  import type { Field, LoadingField } from "~/ankiNoteBuilder";
  import Utils from "~/utils";

  export let field: LoadingField;
  export let bold: boolean = false;

  let loading: boolean;
  let value: string;
  let valueStore: Writable<string>;

  if (field.value instanceof Utils.PromiseWithProgress) {
    loading = true;
    valueStore = field.value.progress;
    field.value.then((v) => {
      loading = false;
      value = v;
    });
  } else {
    loading = false;
    value = field.value;
  }
</script>

<div class="anki-preview-field">
  <div class="field-name" class:bold>{field.name}</div>
  {#if !loading}
    <div class="field-value" contenteditable="true" bind:innerHTML={value} />
  {:else}
    <div class="field-value loading">{@html $valueStore}</div>
  {/if}
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
