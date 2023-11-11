<script lang="ts">
  import type { Writable } from "svelte/store";
  import type { LoadingField } from "~/ankiNoteBuilder";
  import Utils from "~/utils";

  export let field: LoadingField;
  export let bold: boolean = false;
  export let errored: boolean = false;

  let loading: boolean;
  let value: string;
  let valueStore: Writable<string>;

  if (field.value instanceof Utils.PromiseWithProgress) {
    loading = true;
    valueStore = field.value.progress;
    field.value
      .then((v) => {
        loading = false;
        value = v;
      })
      .catch((err) => {
        loading = false;
        errored = true;
        value = Utils.errorMessage(err);
      });
  } else {
    loading = false;
    value = field.value;
  }

  function onFocus() {
    if (errored) {
      value = "";
      errored = false;
    }
  }
</script>

<div class="anki-preview-field">
  <div class="field-name" class:bold>{field.name}</div>
  {#if !loading}
    <div
      class="field-value"
      class:errored
      contenteditable="true"
      bind:innerHTML={value}
      on:focus={onFocus}
    />
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

  .field-value.loading {
    background-color: var(--background-alt);
  }

  .field-value.errored {
    border: 1px solid red;
    color: red;
  }
</style>
