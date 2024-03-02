<script lang="ts">
  import { AnkiApi } from "@platform/anki";
  import AnkiTemplate from "./AnkiTemplate.svelte";

  let ankiInfoP = AnkiApi.getAnkiInfo();
</script>

{#await ankiInfoP}
  <div>Connecting to Anki...</div>
{:then ankiInfo}
  <AnkiTemplate {ankiInfo} />
{:catch err}
  <div class="error">{err.toString()}</div>
{/await}

<style>
  .error {
    color: red;
  }
</style>
