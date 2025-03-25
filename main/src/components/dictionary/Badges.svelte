<script lang="ts">
  import { type Entry, isCommonEntry } from "@/lib/dicEntry";

  export let entry: Entry;

  let isCommon: boolean;
  let hasBadges: boolean;

  $: isCommon = entry.type === "word" && isCommonEntry(entry.entry);
  $: isName = entry.type === "name";
  $: hasBadges = isCommon || isName;
</script>

{#if hasBadges}
  <div class="badges">
    {#if isCommon}
      <div class="badge common">common</div>
    {/if}
    {#if isName}
      <div class="badge name">name</div>
    {/if}
  </div>
{/if}

<style>
  .badges {
    margin: 0.5rem 6px;
    display: flex;
    gap: 0.25rem;
  }

  .badge {
    width: max-content;
    padding: 0.125rem 0.5rem;
    border-radius: 3px;
    color: white;
    background-color: var(--badge-color);
    border: 1px solid var(--badge-color);
    font-size: 0.75rem;
    font-weight: bold;
    line-height: 1;
  }

  /** HSL(x, 38%, 75%) */
  .common {
    --badge-color: #a7d7a7;
  }

  .name {
    --badge-color: #d3a7d7;
  }
</style>
