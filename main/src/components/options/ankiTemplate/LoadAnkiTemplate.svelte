<script lang="ts">
  import type { AnkiOptionsApi } from "@platform/anki";
  import AnkiTemplateEdit from "./AnkiTemplateEdit.svelte";

  export let ankiApi: AnkiOptionsApi;

  let ankiInfoP = ankiApi.getAnkiInfo();
</script>

{#await ankiInfoP}
  <div>Connecting to Anki...</div>
{:then ankiInfo}
  <AnkiTemplateEdit {ankiInfo} />
{:catch err}
  <div class="error">{err.toString()}</div>
{/await}

<style>
  .error {
    color: red;
  }
</style>
