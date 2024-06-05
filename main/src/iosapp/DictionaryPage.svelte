<script lang="ts">
  import type { IosAppPlatform } from "platform/iosapp";
  import DictionaryView from "./DictionaryView.svelte";
  import type Config from "lib/config";
  import type { IosAppBackend } from "platform/iosapp/backend";
  import type { IosAppAnkiApi } from "platform/iosapp/anki";
  import Page from "components/Page.svelte";

  export let initialized: Promise<[Config, IosAppBackend, IosAppAnkiApi]>;
  export let platform: IosAppPlatform;
  export let context: "app" | "action";
  export let searchText = "";
</script>

<Page>
  <div id="main">
    {#await initialized then [config, backend, ankiApi]}
      <DictionaryView
        {context}
        {platform}
        {backend}
        {config}
        {ankiApi}
        {searchText}
      />
    {/await}
  </div>
</Page>

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
