<script lang="ts">
  import { type Entry, isCommonEntry } from "lib/dicEntry";

  export let entry: Entry;

  let isCommon: boolean;
  let hasBadges: boolean;

  $: isCommon = entry.type === "word" && isCommonEntry(entry);
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
    margin: 4px 6px;
    display: flex;
    gap: 4px;
  }

  .badge {
    width: max-content;
    font-size: 0.6rem;
    padding: 1px 4px;
    border-radius: 3px;
    color: var(--badge-color);
    border: 1px solid var(--badge-color);
  }

  .common {
    --badge-color: #8db38d;
  }

  .name {
    --badge-color: #b38db3;
  }
</style>
