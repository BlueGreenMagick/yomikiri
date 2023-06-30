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
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 14px;
    padding-bottom: 4px;
  }

  div > :global(div) {
    border-top: 1px solid lightgray;
  }

  div > :global(div:first-child) {
    border-top: none;
  }
</style>
