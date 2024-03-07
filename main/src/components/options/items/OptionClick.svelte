<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";
  import IconChevronForward from "@icons/chevron-forward.svg";

  export let title: string;
  export let description: string = "";
  export let buttonText: string;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      dispatch("trigger");
      updateConfig();
    }
  }
</script>

<div
  class="option-click"
  on:keydown={onKeyDown}
  on:click={() => {
    dispatch("trigger");
  }}
>
  <OptionBase {title} {description} {disabled}>
    {#if !disabled}
      <div class="icon">{@html IconChevronForward}</div>
    {/if}
  </OptionBase>
</div>

<style>
  .option-click:hover {
    cursor: pointer;
    background-color: var(--background-alt-light);
  }

  .option-click:hover .icon {
    color: var(--button-light);
  }
  .icon {
    width: 18px;
    height: 18px;
    color: var(--button-bg);
  }
</style>
