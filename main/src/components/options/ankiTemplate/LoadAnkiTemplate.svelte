<script lang="ts">
  import {
    AnkiApi,
    type DesktopAnkiApi,
    type IosAppAnkiApi,
  } from "@platform/anki";
  import AnkiTemplateEdit from "./AnkiTemplateEdit.svelte";

  const ankiInfoP = (AnkiApi as DesktopAnkiApi | IosAppAnkiApi).getAnkiInfo();
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
