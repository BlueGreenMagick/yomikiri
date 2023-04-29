<script lang="ts">
  import type { Option } from "./types";
  import IconCaretForward from "../assets/icons/caret-forward.svg";

  export let option: Option;
</script>

<div class="option-item" class:type-click={option.type === "click"}>
  <div class="left">
    <div class="title">{option.title}</div>
    {#if option.description}
      <div class="description">{option.description}</div>
    {/if}
  </div>
  <div class="right">
    {#if option.type === "click"}
      <div class="icon">{@html IconCaretForward}</div>
    {:else if option.type === "number"}
      <input type="number" />
    {/if}
  </div>
</div>

<style>
  .option-item {
    display: flex;
    padding: 6px;

    transition: background-color 0.125s ease-in-out;
  }
  .option-item.type-click:hover,
  .option-item.type-click:active {
    background-color: lightgray;
  }

  .option-item.type-click:hover :global(svg),
  .option-item.type-click:active :global(svg) {
    fill: blue;
  }
  .left {
    flex: 1 0 auto;
  }
  .right {
    flex: 0 0 auto;
  }
  .icon {
    width: 16px;
    height: 16px;
  }
  .title {
  }
  .description {
    color: gray;
  }
</style>
