<script lang="ts">
  import type { IosAppPlatform } from "platform/ios";
  import { platformClass } from "../components/actions";
  import DictionaryView from "./DictionaryView.svelte";
  import type Config from "lib/config";
  import type { IosAppBackend } from "platform/iosapp/backend";
  import type { IosAppAnkiApi } from "platform/iosapp/anki";

  export let initialized: Promise<[Config, IosAppBackend, IosAppAnkiApi]>;
  export let platform: IosAppPlatform;
  export let context: "app" | "action";
  export let searchText = "";
</script>

<div id="main" use:platformClass>
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

<style global>
  @import "../global.css";

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
