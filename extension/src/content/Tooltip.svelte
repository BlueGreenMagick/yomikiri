<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Entry } from "~/dicEntry";
  import IconClose from "@icons/close.svg";
  import DicEntriesView from "~/components/DicEntriesView.svelte";
  import { platformClass } from "~/components/actions";

  interface Events {
    close: MouseEvent;
  }

  const dispatch = createEventDispatcher<Events>();

  let entries: Entry[];

  export function setEntries(e: Entry[]) {
    entries = e;
  }
</script>

<div use:platformClass>
  <button class="close-button" on:click={(ev) => dispatch("close", ev)}
    ><div class="icon">{@html IconClose}</div></button
  >

  <DicEntriesView {entries} on:addNote />
</div>

<style>
  .close-button {
    width: 64px;
    height: 32px;

    position: fixed;
    right: 1px;
    top: 1px;
    z-index: 10;

    display: flex;
    justify-content: center;
    align-items: center;

    border: 1px solid black;
    border-radius: 2px;
    opacity: 0.6;
  }

  .close-button:hover {
    opacity: 1;
  }

  .icon {
    width: 24px;
    height: 24px;
  }
</style>
