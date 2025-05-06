<script lang="ts">
  import LoadingPage from "../components/LoadingPage.svelte";
  import PageSetup from "../components/PageSetup.svelte";
  import type { AppContext } from "../context";
  import OptionsColumns from "./OptionsColumns.svelte";

  export let initialize: () => Promise<AppContext>;
</script>

{#await initialize()}
  <LoadingPage />
{:then ctx}
  <PageSetup {ctx} />
  <OptionsColumns {ctx} />
{:catch}
  Error!
{/await}

<style global>
  @import "./styles.css";
</style>
