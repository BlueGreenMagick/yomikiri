<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Entry } from "../dictionary";
  import EntryView from "./EntryView.svelte";
  import CloseButton from "./CloseButton.svelte";

  const dispatch = createEventDispatcher();
  let entries: Entry[] = [];

  export function setEntries(e: Entry[]) {
    entries = e;
  }
</script>

<div id="yomikiri-entriesview">
  <CloseButton on:click={(ev) => dispatch("close", ev)} />
  {#each entries as entry}
    <EntryView {entry} />
  {/each}
</div>

<style>
  div {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 14px;

    --header-height: 32px;
    --close-button-width: 64px;
  }

  div > :global(div) {
    border-top: 1px solid lightgray;
  }

  div > :global(div:first-child) {
    border-top: none;
  }
</style>
