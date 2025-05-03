<script lang="ts">
  import { type NameEntry } from "@/features/dicEntry";
  import DicNameGroupedSense from "./DicNameGroupedSense.svelte";

  export let entry: NameEntry;
</script>

<div class="entry-content">
  <div class="groups">
    {#each entry.groups as group}
      <DicNameGroupedSense {group} />
    {/each}
  </div>
</div>
