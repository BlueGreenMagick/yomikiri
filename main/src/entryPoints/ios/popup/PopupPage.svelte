<script lang="ts">
  import LoadingPage from "@/features/components/LoadingPage.svelte";
  import PageSetup from "@/features/components/PageSetup.svelte";
  import type { AppCtx, IosCtx } from "@/features/ctx";
  import { ActionButtons } from "@/features/popup";

  export let initialize: () => Promise<AppCtx<IosCtx>>;
</script>

{#await initialize()}
  <LoadingPage />
{:then ctx}
  <PageSetup {ctx} />
  <div id="main">
    <ActionButtons {ctx} />
  </div>
{:catch e}
  {e}
{/await}

<style global>
  /** 
  in desktop, body height should change according to content height
  in ios, body should fill the entire popup height
  */
  html.ios,
  html.ios body {
    height: 100%;
  }

  #main {
    height: 100%;
    min-height: 200px;
    margin: 0 auto;
    padding: 0;
    overflow-y: auto;

    display: flex;
    flex-direction: column;
  }

  html.desktop body {
    width: 360px;
  }

  :global(.ios) #main {
    max-height: 100%;
  }

  :global(.desktop) #main {
    max-height: 600px;
  }
</style>
