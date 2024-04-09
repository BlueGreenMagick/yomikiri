<script lang="ts">
  import type { AnkiOptionsApi } from "@platform/anki";
  import AnkiTemplate from "./AnkiTemplate.svelte";
  import type { Config } from "~/config";

  export let config: Config
  export let ankiApi: AnkiOptionsApi

  let ankiInfoP = ankiApi.getAnkiInfo();
</script>

{#await ankiInfoP}
  <div>Connecting to Anki...</div>
{:then ankiInfo}
  <AnkiTemplate {ankiInfo} {config} />
{:catch err}
  <div class="error">{err.toString()}</div>
{/await}

<style>
  .error {
    color: red;
  }
</style>
