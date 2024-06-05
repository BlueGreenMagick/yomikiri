<script lang="ts">
  import { Platform } from "@platform";
  import type { AnkiOptionsApi } from "@platform/anki";
  import type { Dictionary } from "@platform/dictionary";
  import type { Config } from "lib/config";
  import OptionsColumns from "./OptionsColumns.svelte";
  import Page from "components/Page.svelte";

  export let platform: Platform;
  export let initialized: Promise<[Config, AnkiOptionsApi, Dictionary]>;
</script>

<Page>
  {#await initialized then [config, ankiApi, dictionary]}
    <OptionsColumns {platform} {config} {ankiApi} {dictionary} />
  {/await}
</Page>

<style global>
  @import "./styles.css";
</style>
