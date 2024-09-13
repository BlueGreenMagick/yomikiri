<script lang="ts">
  import { type Entry, isCommonEntry } from "lib/dicEntry";

  export let entry: Entry;

  let isCommon: boolean;
  let hasBadges: boolean;

  $: isCommon = entry.type === "word" && isCommonEntry(entry);
  $: hasBadges = isCommon;
</script>

{#if hasBadges}
  <div class="badges">
    {#if isCommon}
      <div class="badge">common</div>
    {/if}
    {#if entry.type === "name"}
      <div class="badge">name</div>
    {/if}
  </div>
{/if}

<style>
  .badges {
    margin: 4px 6px;
    display: flex;
    gap: 4px;
  }

  .badge {
    width: max-content;
    font-size: 0.6rem;
    color: #8db38d;
    padding: 1px 4px;
    border: 1px solid #8db38d;
    border-radius: 3px;
  }
</style>
