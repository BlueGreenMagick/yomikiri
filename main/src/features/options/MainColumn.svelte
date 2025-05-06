<script lang="ts">
  import GroupAppearance from "./groups/GroupAppearance.svelte";
  import GroupAnki from "./groups/GroupAnki.svelte";
  import GroupAbout from "./groups/GroupAbout.svelte";
  import GroupDictionary from "./groups/GroupDictionary.svelte";
  import { Platform } from "#platform";
  import type { AppContext } from "../context";

  export let ctx: AppContext;
</script>

<div>
  <GroupAppearance {ctx} />
  <GroupAnki {ctx} />
  <!-- eslint-disable-next-line -->
  {#if Platform.type === "desktop" || Platform.type === "iosapp"}
    <GroupDictionary />
  {/if}
  <GroupAbout />
</div>
