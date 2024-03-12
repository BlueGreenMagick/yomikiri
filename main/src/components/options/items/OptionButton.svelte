<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";
  import IconChevronForward from "@icons/chevron-forward.svg";

  export let title: string;
  export let buttonText: string;
  export let disabled: boolean = false;
  export let onClicked: () => any;
</script>

<div class="option-button" class:disabled>
  <OptionBase {title} {disabled}>
    <button on:click={() => onClicked()}>
      {buttonText}
    </button>
    <slot slot="description" />
  </OptionBase>
</div>

<style>
  .option-button.disabled {
    filter: opacity(0.5);
  }

  button {
    padding: 2px 4px;
    min-width: 120px;
    transition: background-color 0.125s ease-in-out;
    text-align: center;
  }
</style>
