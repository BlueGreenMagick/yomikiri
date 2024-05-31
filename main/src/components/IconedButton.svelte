<script lang="ts">
  /* Styles */
  export let size = "2rem";
  export let padding = "0.3rem";
  export let color = "var(--button-light)";
  export let colorHover = "var(--text)";

  /* States */
  export let hidden = false;
  export let highlight = false;
  export let active = false;
  export let disabled = false;
</script>

<button
  class="iconed-button"
  class:highlight
  class:active
  class:hidden
  class:disabled
  {disabled}
  style="--size: {size}; --color: {color}; --padding: {padding}; --color-hover: {colorHover}"
  on:click
  on:mousedown|preventDefault|stopPropagation={() => null}
>
  <slot />
</button>

<style>
  button {
    width: var(--size);
    height: var(--size);
    color: var(--color);
    fill: var(--color);
    padding: var(--padding);

    border-radius: 4px;
  }

  button.hidden {
    visibility: hidden;
  }

  button.highlight {
    color: var(--accent);
    fill: var(--accent);
    filter: saturate(0.9);
  }

  button:not(.disabled).active,
  :global(html.desktop) button.active:hover,
  button.active:active {
    color: var(--color-hover);
    fill: var(--color-hover);
    background-color: rgba(0, 0, 0, 0.12);
  }

  :global(html.desktop) button:not(.disabled):hover,
  button:active :not(.disabled) {
    color: var(--color-hover);
    fill: var(--color-hover);
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.07);
  }

  :global(html.desktop) button.highlight:not(.disabled):hover,
  button.highlight:not(.disabled):active {
    color: var(--accent);
    fill: var(--accent);
    filter: saturate(1.2);
  }

  :global(html.ios) button:focus-visible,
  :global(html.iosapp) button:focus-visible {
    outline: none;
  }

  button.disabled {
    filter: opacity(0.6);
  }

  /** Centers icon vertically */
  button :global(svg) {
    display: block;
  }
</style>
