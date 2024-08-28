<script lang="ts">
  import type { AnkiOptionsApi } from "@platform/anki";
  import OptionsColumns from "./OptionsColumns.svelte";
  import Page from "components/Page.svelte";

  export let initialized: Promise<[AnkiOptionsApi]>;
</script>

<Page>
  {#await initialized then [ankiApi]}
    <OptionsColumns {ankiApi} />
  {/await}
</Page>

<style global>
  @import "./styles.css";
</style>
