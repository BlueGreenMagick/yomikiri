<script lang="ts">
  import type { Entry } from "lib/dicEntry";
  import DicEntryView, {
    type SelectedEntryForAnki,
  } from "./DicEntryView.svelte";
  import { DicEntriesModel } from "./dicEntriesModel";

  export let entries: Entry[];
  export let onSelectEntryForAnki: (
    selected: SelectedEntryForAnki,
  ) => void = () => null;

  let model: DicEntriesModel = new DicEntriesModel();

  function onEntriesChange(_e: Entry[]) {
    model.reset();
  }

  function onMouseDown(_ev: MouseEvent) {
    model.unselectSense();
  }

  $: onEntriesChange(entries);
</script>

<div id="yomikiri-entries" on:mousedown={onMouseDown}>
  {#each entries as entry (entry)}
    <DicEntryView {entry} {model} {onSelectEntryForAnki} />
  {/each}
</div>

<style>
  div {
    font-size: 1rem;
    padding-bottom: 4px;
  }

  div > :global(div) {
    border-top: 1px solid var(--border);
  }

  div > :global(div:first-child) {
    border-top: none;
  }
</style>
