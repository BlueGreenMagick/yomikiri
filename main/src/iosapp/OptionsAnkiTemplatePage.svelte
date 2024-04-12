<script lang="ts">
  import type Config from "~/config";
  import LoadAnkiTemplate from "../components/options/modals/LoadAnkiTemplate.svelte";
  import { platformClass } from "~/components/actions";
  import type { IosAppAnkiApi } from "~/platform/iosapp/anki";
  import type { IosAppPlatform } from "~/platform/iosapp";

  export let platform: IosAppPlatform;
  export let initialized: Promise<[Config, IosAppAnkiApi]>;
</script>

<div id="main" use:platformClass>
  {#await initialized then [config, ankiApi]}
    <LoadAnkiTemplate {platform} {config} {ankiApi} />
  {/await}
</div>

<style global>
  @import "../global.css";
  @import "../components/options/styles.css";

  #main {
    padding: 16px;
    overflow-x: hidden;
  }
</style>
