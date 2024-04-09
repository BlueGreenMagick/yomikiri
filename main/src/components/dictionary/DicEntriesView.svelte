<script lang="ts">
  import type { Entry } from "~/dicEntry";
  import DicEntryView from "./DicEntryView.svelte";
  import { DicEntriesModel } from "./dicEntriesModel";
  import type { Platform } from "@platform"
  import type { Config } from "~/config"

  export let platform: Platform
  export let config: Config
  export let entries: Entry[];

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
  {#each entries as entry}
    <DicEntryView {platform} {config} {entry} {model} on:selectedEntryForAnki />
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
