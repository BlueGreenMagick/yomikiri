<script lang="ts">
  import OptionBase from "./OptionBase.svelte";
  import IconChevronForward from "#icons/chevron-forward.svg";

  export let title: string;
  export let buttonText: string;
  export let disabled = false;
  export let onClick: () => void;

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      onClick();
    }
  }
</script>

<div
  class="option-click"
  class:disabled
  role="button"
  tabindex="0"
  on:keydown={onKeyDown}
  on:click={() => {
    if (!disabled) {
      onClick();
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

  :global(html.desktop) .option-click:not(.disabled):hover,
  .option-click:not(.disabled):active {
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
