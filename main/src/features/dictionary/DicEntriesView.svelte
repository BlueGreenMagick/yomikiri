<script lang="ts">
  import type { Entry } from "@/features/dicEntry";
  import type { AppCtx } from "../ctx";
  import { DicEntriesModel } from "./dicEntriesModel";
  import DicEntryView from "./DicEntryView.svelte";
  import type { SelectedEntryForAnki } from "./types";

  export let ctx: AppCtx;
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
    <DicEntryView {ctx} {entry} {model} {onSelectEntryForAnki} />
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
