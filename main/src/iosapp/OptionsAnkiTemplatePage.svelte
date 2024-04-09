<script lang="ts">
  import type Config from "~/config";
  import LoadAnkiTemplate from "../components/options/modals/LoadAnkiTemplate.svelte";
  import { platformClass } from "~/components/actions";
  import type { IosAppAnkiApi } from "~/platform/common/anki";

  export let initialized: Promise<[Config, IosAppAnkiApi]>;
</script>

<div id="main" use:platformClass>
  {#await initialized then [config, ankiApi]}
    <LoadAnkiTemplate {config} {ankiApi} />
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
