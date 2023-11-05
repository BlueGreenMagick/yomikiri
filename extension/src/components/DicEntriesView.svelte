<script lang="ts">
  import type { Entry } from "~/dicEntry";
  import DicEntryView from "./DicEntryView.svelte";
  import { DicEntriesModel } from "./dicEntriesModel";

  export let entries: Entry[];
  let model: DicEntriesModel = new DicEntriesModel();

  function onEntriesChange(e: Entry[]) {
    model.reset();
  }

  $: onEntriesChange(entries);
</script>

<div id="yomikiri-entries">
  {#each entries as entry}
    <DicEntryView {entry} {model} on:addNote />
  {/each}
</div>

<style>
  div {
    font-size: 1em;
    padding-bottom: 4px;
  }

  div > :global(div) {
    border-top: 1px solid var(--border);
  }

  div > :global(div:first-child) {
    border-top: none;
  }
</style>
