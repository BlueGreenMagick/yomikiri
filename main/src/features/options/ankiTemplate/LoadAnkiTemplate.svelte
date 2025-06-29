<script lang="ts">
  import type {
    AndroidCtx,
    AppCtx,
    DesktopCtx,
    IosAppCtx,
  } from "@/features/ctx";
  import AnkiTemplateEdit from "./AnkiTemplateEdit.svelte";

  export let ctx: AppCtx<DesktopCtx | IosAppCtx | AndroidCtx>;

  const ankiInfoP = ctx.anki.getAnkiInfo();
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
