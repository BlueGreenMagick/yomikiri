<script lang="ts">
  import {
    AnkiApi,
    type DesktopAnkiApi,
    type IosAppAnkiApi,
  } from "@platform/anki";
  import AnkiTemplateEdit from "./AnkiTemplateEdit.svelte";
  import Config from "lib/config";

  const config = Config.using();
  const ankiApi = new AnkiApi(config) as DesktopAnkiApi | IosAppAnkiApi;
  const ankiInfoP = ankiApi.getAnkiInfo();
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
