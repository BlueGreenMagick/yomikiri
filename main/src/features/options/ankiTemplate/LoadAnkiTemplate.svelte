<script lang="ts">
  import type { AppCtx } from "@/features/ctx";
  import AnkiTemplateEdit from "./AnkiTemplateEdit.svelte";
  import {
    Platform,
    type DesktopPlatform,
    type IosAppPlatform,
  } from "#platform";

  export let ctx: AppCtx;

  const ankiInfoP = (
    Platform as DesktopPlatform | IosAppPlatform
  ).anki.getAnkiInfo();
</script>

{#await ankiInfoP}
  <div>Connecting to Anki...</div>
{:then ankiInfo}
  <AnkiTemplateEdit {ctx} {ankiInfo} />
{:catch err}
  <div class="error">{err.toString()}</div>
{/await}

<style>
  .error {
    color: red;
  }
</style>
