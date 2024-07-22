<script lang="ts">
  import type { AnkiOptionsApi } from "@platform/anki";
  import type { Config } from "lib/config";
  import OptionsColumns from "./OptionsColumns.svelte";
  import Page from "components/Page.svelte";

  export let initialized: Promise<[Config, AnkiOptionsApi]>;
</script>

<Page>
  {#await initialized then [config, ankiApi]}
    <OptionsColumns {config} {ankiApi} />
  {/await}
</Page>

<style global>
  @import "./styles.css";
</style>
