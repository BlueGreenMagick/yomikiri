<script lang="ts">
  import type { Option, OptionsGroup } from "./types";
  import OptionItem from "./OptionItem.svelte";

  export let group: OptionsGroup;
</script>

<div class="options-group">
  <div class="title">{group.name}</div>
  <div class="grouped">
    {#each group.options as option}
      <OptionItem {option} />
    {/each}
  </div>
</div>

<style>
  .title {
    font-size: 2em;
  }
  .grouped {
    margin-top: 8px;
    border-radius: 6px;

    font-size: 1.2em;

    background-color: white;
    box-shadow: 0 1px 4px gray;
  }
</style>
