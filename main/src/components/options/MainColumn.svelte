<script lang="ts">
  import GroupAppearance from "./groups/GroupAppearance.svelte";
  import GroupAnki from "./groups/GroupAnki.svelte";
  import GroupAbout from "./groups/GroupAbout.svelte";
  import GroupDictionary from "./groups/GroupDictionary.svelte";
  import type Config from "lib/config";
  import type { AnkiOptionsApi } from "@platform/anki";
  import { Platform } from "@platform";

  export let config: Config;
  export let ankiApi: AnkiOptionsApi;
</script>

<div>
  <GroupAppearance {config} />
  <GroupAnki {config} {ankiApi} />
  <!-- eslint-disable-next-line -->
  {#if Platform.IS_DESKTOP || Platform.IS_IOSAPP}
    <GroupDictionary />
  {/if}
  <GroupAbout />
</div>
