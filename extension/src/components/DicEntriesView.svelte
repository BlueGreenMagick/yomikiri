<script lang="ts">
  import type { Entry } from "~/dicEntry";
  import DicEntryView from "./DicEntryView.svelte";

  export let entries: Entry[] = [];

  export function setEntries(e: Entry[]) {
    entries = e;
  }
</script>

<div id="yomikiri-entries">
  {#each entries as entry}
    <DicEntryView {entry} on:addNote />
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
