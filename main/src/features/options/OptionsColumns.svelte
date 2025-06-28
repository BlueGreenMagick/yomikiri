<script lang="ts">
  import type { AndroidCtx, AppCtx, DesktopCtx, IosAppCtx } from "../ctx";
  import MainColumn from "./MainColumn.svelte";
  import PreviewColumn from "./PreviewColumn.svelte";

  export let ctx: AppCtx<DesktopCtx | IosAppCtx | AndroidCtx>;
</script>

<div class="container">
  <div id="main-column">
    <MainColumn {ctx} />
  </div>
  {#if ctx.platformType === "desktop"}
    <div id="preview-column"><PreviewColumn {ctx} /></div>
  {/if}
</div>

<style>
  .container {
    display: flex;
    margin: 0px 12px;
    gap: 12px;
  }

  @media (max-width: 900px) {
    #preview-column {
      display: none;
    }
  }

  #main-column {
    max-width: 900px;
    flex: 2 1 0;
    margin: 12px 0px;
    overflow-x: hidden;
  }

  #preview-column {
    max-width: 500px;
    min-width: 300px;
    flex: 1 0 0;
  }
</style>
