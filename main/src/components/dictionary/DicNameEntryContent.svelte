<script lang="ts">
  import { type Entry } from "lib/dicEntry";
  import DicNameGroupedSense from "./DicNameGroupedSense.svelte";

  export let entry: Entry.name;
</script>

<div class="entry-content">
  <div class="groups">
    {#each entry.groups as group}
      <DicNameGroupedSense {group} />
    {/each}
  </div>
</div>
