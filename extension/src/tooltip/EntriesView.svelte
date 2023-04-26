<script lang="ts">
  import type { Entry } from "../dictionary";
  import EntryView from "./EntryView.svelte";

  let entries: Entry[] = [];

  export function setEntries(e: Entry[]) {
    entries = e;
  }
</script>

<div id="yomikiri-entriesview">
  {#each entries as entry}
    <EntryView {entry} />
  {/each}
</div>

<style>
  div {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 14px;
  }

  div > :global(div) {
    border-top: 1px solid lightgray;
  }

  div > :global(div:first-child) {
    border-top: none;
  }
</style>
