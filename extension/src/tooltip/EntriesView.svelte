<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Entry } from "~/dicEntry";
  import EntryView from "./EntryView.svelte";
  import CloseButton from "./CloseButton.svelte";

  interface Events {
    close: MouseEvent;
  }

  const dispatch = createEventDispatcher<Events>();

  let entries: Entry[] = [];

  export function setEntries(e: Entry[]) {
    entries = e;
  }
</script>

<div id="yomikiri-entriesview">
  <CloseButton on:click={(ev) => dispatch("close", ev)} />
  {#each entries as entry}
    <EntryView {entry} on:addNote />
  {/each}
</div>

<style>
  div {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 14px;
    padding-bottom: 4px;

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
