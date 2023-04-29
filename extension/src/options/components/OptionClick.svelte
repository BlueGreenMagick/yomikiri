<script lang="ts">
  import OptionBase from "./OptionBase.svelte";
  import IconCaretForward from "@icons/caret-forward.svg";

  export let title: string;
  export let description: string = "";
</script>

<div on:click tabindex="0">
  <OptionBase {title} {description}>
    <div class="icon">{@html IconCaretForward}</div>
  </OptionBase>
</div>

<style>
  div {
    transition: background-color 0.125s ease-in-out;
  }
  div:hover {
    background-color: lightgray;
  }
  div:hover .icon :global(svg) {
    fill: blue;
  }
  .icon {
    width: 16px;
    height: 16px;
  }
</style>
