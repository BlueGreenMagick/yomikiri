<script lang="ts">
  import GroupAppearance from "./groups/GroupAppearance.svelte";
  import GroupAnki from "./groups/GroupAnki.svelte";
  import GroupAbout from "./groups/GroupAbout.svelte";
  import GroupDictionary from "./groups/GroupDictionary.svelte";
  import type { AppCtx, DesktopCtx, IosAppCtx } from "../ctx";

  export let ctx: AppCtx<DesktopCtx | IosAppCtx>;
</script>

<div>
  <GroupAppearance {ctx} />
  <GroupAnki {ctx} />
  {#if ctx.platformType === "desktop" || ctx.platformType === "iosapp"}
    <GroupDictionary {ctx} />
  {/if}
  <GroupAbout {ctx} />
</div>
