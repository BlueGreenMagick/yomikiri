<script lang="ts">
  import type { Entry } from "../dictionary";
  import EntryView from "./EntryView.svelte";

  let x: number = 0;
  let y: number = 0;
  let visible: boolean = false;
  let entry: Entry | null = null;

  export function show(xx: number, yy: number, e: Entry) {
    x = xx;
    y = yy;
    visible = true;
    entry = e;
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
  {#if entry !== null}
    <EntryView {entry} />
  {/if}
</div>

<style>
  div {
    position: fixed;
    max-width: 600px;
    min-width: 300px;
    background-color: white;
    border: 1px solid black;
    z-index: 999;
  }
</style>
