<script lang="ts">
  import type Config from "lib/config";
  import LoadAnkiTemplate from "components/options/ankiTemplate/LoadAnkiTemplate.svelte";
  import type { IosAppAnkiApi } from "platform/iosapp/anki";
  import type { IosAppPlatform } from "platform/iosapp";
  import Page from "components/Page.svelte";

  export let platform: IosAppPlatform;
  export let initialized: Promise<[Config, IosAppAnkiApi]>;
</script>

<Page>
  <div id="main">
    {#await initialized then [config, ankiApi]}
      <LoadAnkiTemplate {platform} {config} {ankiApi} />
    {/await}
  </div>
</Page>

<style global>
  @import "../components/options/styles.css";

  #main {
    padding: 16px;
    overflow-x: hidden;
  }
</style>
