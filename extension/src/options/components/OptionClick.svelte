<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import OptionBase from "./OptionBase.svelte";
  import IconCaretForward from "@icons/caret-forward.svg";

  export let title: string;
  export let description: string = "";

  const dispatch = createEventDispatcher();

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      dispatch("trigger");
    }
  }
</script>

<div
  tabindex="0"
  on:keydown={onKeyDown}
  on:click={() => {
    dispatch("trigger");
  }}
>
  <OptionBase {title} {description}>
    <div class="icon">{@html IconCaretForward}</div>
  </OptionBase>
</div>

<style>
  div {
    transition: background-color 0.125s ease-in-out;
  }
  div:hover,
  div:active,
  div:focus {
    background-color: lightgray;
  }
  div:hover .icon :global(svg),
  div:active .icon :global(svg),
  div:focus .icon :global(svg) {
    fill: blue;
  }
  .icon {
    width: 16px;
    height: 16px;
  }
</style>
