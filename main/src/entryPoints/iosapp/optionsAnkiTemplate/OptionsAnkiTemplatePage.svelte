<script lang="ts">
  import LoadingPage from "@/features/components/LoadingPage.svelte";
  import PageSetup from "@/features/components/PageSetup.svelte";
  import type { AppCtx, IosAppCtx } from "@/features/ctx";
  import { LoadAnkiTemplate } from "@/features/options";

  export let initialize: () => Promise<AppCtx<IosAppCtx>>;
</script>

{#await initialize()}
  <LoadingPage />
{:then ctx}
  <PageSetup {ctx} />
  <div id="main">
    <LoadAnkiTemplate {ctx} />
  </div>
{:catch}
  Error!
{/await}

<style global>
  @import "features/options/styles.css";

  #main {
    overflow-x: hidden;
  }
</style>
