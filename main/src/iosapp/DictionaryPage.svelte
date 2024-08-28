<script lang="ts">
  import DictionaryView from "./DictionaryView.svelte";
  import type { IosAppAnkiApi } from "platform/iosapp/anki";
  import Page from "components/Page.svelte";

  export let initialized: Promise<[IosAppAnkiApi]>;
  export let context: "app" | "action";
  export let searchText = "";
</script>

<Page>
  <div id="main">
    {#await initialized then [ankiApi]}
      <DictionaryView {context} {ankiApi} {searchText} />
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
