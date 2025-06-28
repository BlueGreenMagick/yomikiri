<script lang="ts">
  import type { AndroidCtx, AppCtx, DesktopCtx, IosAppCtx } from "../ctx";
  import GroupAbout from "./groups/GroupAbout.svelte";
  import GroupAnki from "./groups/GroupAnki.svelte";
  import GroupAppearance from "./groups/GroupAppearance.svelte";
  import GroupDictionary from "./groups/GroupDictionary.svelte";

  export let ctx: AppCtx<DesktopCtx | IosAppCtx | AndroidCtx>;
</script>

<div>
  <GroupAppearance {ctx} />
  <GroupAnki {ctx} />
  {#if ctx.platformType === "desktop" || ctx.platformType === "iosapp"}
    <GroupDictionary {ctx} />
  {/if}
  <GroupAbout {ctx} />
</div>
