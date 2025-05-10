<script lang="ts">
  import type { GroupedNameItem } from "@yomikiri/backend-bindings";

  export let group: GroupedNameItem;

  let categoryText: string;

  $: categoryText = group.types.join(", ");
</script>

<div class="name-grouped-sense">
  <div class="categories">
    {categoryText}
  </div>
  <div class="readings">
    {#each group.items as item, idx (item)}
      <div class="reading Japanese">
        {idx + 1}. {item.reading}
      </div>
    {/each}
  </div>
</div>

<style>
  .name-grouped-sense:first-child {
    margin-top: 0.25rem;
  }

  .name-grouped-sense {
    margin-top: 0.5rem;
  }

  .categories {
    color: var(--text-light);
    font-size: 0.875rem;
    margin-bottom: 4px;
    padding: 0 var(--edge-horizontal-padding);
  }

  .readings {
    column-count: 2;
    column-gap: 0.5rem;
  }

  .reading {
    font-size: 1rem;
    line-height: 1.25;
    padding: 0 var(--edge-horizontal-padding);
  }
</style>
