<script lang="ts">
  import OptionBase from "./OptionBase.svelte";

  export let title: string;
  export let buttonText: string;
  export let disabled = false;
  export let onClicked: () => void;
</script>

<div class="option-button" class:disabled>
  <OptionBase {title} {disabled}>
    <button
      on:click={() => {
        onClicked();
      }}
      {disabled}
    >
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
    border: 1px solid black;
    border-radius: 3px;
    background-color: var(--background-alt);
    padding: 2px 4px;
    min-width: 120px;
    transition: background-color 0.125s ease-in-out;
    text-align: center;
  }

  button:focus-visible {
    border: 1px solid transparent;
  }
</style>
