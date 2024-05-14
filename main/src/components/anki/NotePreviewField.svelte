<script lang="ts">
  import type { Writable } from "svelte/store";
  import type { LoadingField } from "lib/anki";
  import { PromiseWithProgress, getErrorMessage } from "lib/utils";

  export let field: LoadingField;
  export let bold = false;
  export let errored = false;

  let loading: boolean;
  let value: string;
  let valueStore: Writable<string>;

  if (field.value instanceof PromiseWithProgress) {
    loading = true;
    valueStore = field.value.progress;
    field.value
      .then((v) => {
        loading = false;
        value = v;
      })
      .catch((err: unknown) => {
        loading = false;
        errored = true;
        value = getErrorMessage(err);
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

  $: field.value = value;
</script>

<div class="anki-preview-field">
  <div class="field-name" class:bold>{field.name}</div>
  {#if !loading}
    <div
      class="field-value"
      class:errored
      contenteditable="true"
      bind:textContent={value}
      on:focus={onFocus}
    />
  {:else}
    <div class="field-value loading">{$valueStore}</div>
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
    color: var(--text-light);
  }

  .field-value.errored {
    border: 1px solid var(--text-warn);
    color: var(--text-warn);
  }
</style>
