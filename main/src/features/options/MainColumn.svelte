<script lang="ts">
  import GroupAppearance from "./groups/GroupAppearance.svelte";
  import GroupAnki from "./groups/GroupAnki.svelte";
  import GroupAbout from "./groups/GroupAbout.svelte";
  import GroupDictionary from "./groups/GroupDictionary.svelte";
  import {
    isDesktopCtx,
    isIosAppCtx,
    type AppCtx,
    type DesktopCtx,
    type IosAppCtx,
  } from "../ctx";

  export let ctx: AppCtx<DesktopCtx | IosAppCtx>;
</script>

<div>
  <GroupAppearance {ctx} />
  <GroupAnki {ctx} />
  <!-- eslint-disable-next-line -->
  {#if isDesktopCtx(ctx) || isIosAppCtx(ctx)}
    <GroupDictionary {ctx} />
  {/if}
  <GroupAbout {ctx} />
</div>
