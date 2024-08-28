<script lang="ts">
  import LoadAnkiTemplate from "components/options/ankiTemplate/LoadAnkiTemplate.svelte";
  import type { IosAppAnkiApi } from "platform/iosapp/anki";
  import Page from "components/Page.svelte";

  export let initialized: Promise<[IosAppAnkiApi]>;
</script>

<Page>
  <div id="main">
    {#await initialized then [ankiApi]}
      <LoadAnkiTemplate {ankiApi} />
    {/await}
  </div>
</Page>

<style global>
  @import "../components/options/styles.css";

  #main {
    overflow-x: hidden;
  }
</style>
