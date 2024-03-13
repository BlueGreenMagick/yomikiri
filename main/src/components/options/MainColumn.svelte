<script lang="ts">
  import GroupAppearance from "./groups/GroupAppearance.svelte";
  import GroupAnki from "./groups/GroupAnki.svelte";
  import GroupAbout from "./groups/GroupAbout.svelte";
  import GroupDictionary from "./groups/GroupDictionary.svelte";
  import { Platform } from "@platform";
</script>

<div>
  <GroupAppearance />
  <GroupAnki />
  {#if Platform.IS_DESKTOP || Platform.IS_IOSAPP}
    <GroupDictionary />
  {/if}
  <GroupAbout />
</div>
