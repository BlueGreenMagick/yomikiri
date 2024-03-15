<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import OptionBase from "./OptionBase.svelte";
  import IconChevronForward from "@icons/chevron-forward.svg";

  export let title: string;
  export let buttonText: string;
  export let disabled: boolean = false;

  const dispatch = createEventDispatcher();

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      dispatch("trigger");
    }
  }
</script>

<div
  class="option-click"
  class:disabled
  on:keydown={onKeyDown}
  on:click={() => {
    if (!disabled) {
      dispatch("trigger");
    }
  }}
>
  <OptionBase {title} {disabled}>
    <div class="button">
      <div class="button-text">{buttonText}</div>
      <div class="icon"><IconChevronForward /></div>
    </div>
    <slot slot="description" />
  </OptionBase>
</div>

<style>
  .option-click {
    user-select: none;
    -webkit-user-select: none;
  }

  .option-click.disabled {
    filter: opacity(0.5);
  }

  .option-click:not(.disabled):hover {
    cursor: pointer;
    background-color: var(--background-alt-light);
  }

  .button {
    color: var(--text-light);
    display: flex;
    align-items: center;
  }

  .icon {
    width: 18px;
    height: 18px;
  }
</style>
