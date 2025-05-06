<script lang="ts">
  import type { AppCtx, IosAppCtx } from "@/features/ctx";
  import DictionaryView from "./DictionaryView.svelte";
  import PageSetup from "@/features/components/PageSetup.svelte";
  import LoadingPage from "@/features/components/LoadingPage.svelte";

  export let initialize: () => Promise<AppCtx<IosAppCtx>>;
  export let context: "app" | "action";
  export let searchText = "";
</script>

{#await initialize()}
  <LoadingPage />
{:then ctx}
  <PageSetup {ctx} />
  <div id="main">
    <DictionaryView {ctx} {context} {searchText} />
  </div>
{/await}

<style global>
  html,
  html body {
    height: 100%;
  }

  #main {
    height: 100%;
    min-height: 200px;
    min-width: 300px;
    margin: 0 auto;
    padding: 0;

    display: flex;
    flex-direction: column;
  }
</style>
