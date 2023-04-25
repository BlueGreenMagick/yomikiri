<script lang="ts">
  import type { Entry } from "../dictionary";
  import GroupedSense from "./GroupedSense.svelte";

  export let entry: Entry;

  $: groups = entry.groupSenses();
</script>

<div>
  {#each groups as group}
    <GroupedSense {group} />
  {/each}
</div>
