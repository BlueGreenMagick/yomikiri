<script lang="ts">
  import type { Entry } from "../dictionary";
  import EntryView from "./EntryView.svelte";

  let x: number = 0;
  let y: number = 0;
  let visible: boolean = false;
  let entries: Entry[] = [];

  export function show(e: Entry[], range: Range) {
    const rect = range.getClientRects()[0];
    x = rect.left;
    y = rect.bottom + 5;
    visible = true;
    entries = e;
  }

  export function hide() {
    visible = false;
  }
</script>

<div
  style:top="{y}px"
  style:left="{x}px"
  style:visibility={visible ? "visible" : "hidden"}
>
  {#each entries as entry}
    <EntryView {entry} />
  {/each}
</div>

<style>
  div {
    position: fixed;
    max-width: 600px;
    min-width: 300px;
    background-color: white;
    border: 1px solid black;
    z-index: 999;
    max-height: 300px;
    overflow-y: auto;
  }

  div > :global(div) {
    border-top: 1px solid lightgray;
    margin-top: 15px;
  }

  div > :global(div:first-child) {
    border-top: none;
    margin-top: 0px;
  }
</style>
