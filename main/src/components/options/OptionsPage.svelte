<script lang="ts">
  import { platformClass } from "components/actions";
  import { Platform } from "@platform";
  import type { AnkiOptionsApi } from "@platform/anki";
  import type { Dictionary } from "@platform/dictionary";
  import type { Config } from "lib/config";
  import OptionsColumns from "./OptionsColumns.svelte";

  export let platform: Platform;
  export let initialized: Promise<[Config, AnkiOptionsApi, Dictionary]>;
</script>

<div use:platformClass>
  {#await initialized then [config, ankiApi, dictionary]}
    <OptionsColumns {platform} {config} {ankiApi} {dictionary} />
  {/await}
</div>

<style global>
  @import "../../global.css";
  @import "./styles.css";
</style>
