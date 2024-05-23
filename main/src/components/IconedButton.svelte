<script lang="ts">
  /* Styles */
  export let size = "2rem";
  export let padding = "0.3rem";
  export let color = "var(--button-light)";

  /* States */
  export let hidden = false;
  export let highlight = false;
  export let active = false;
</script>

<button
  class="iconed-button"
  class:highlight
  class:active
  class:hidden
  style="--size: {size}; --color: {color}; --padding: {padding};"
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
  }

  button.hidden {
    visibility: hidden;
  }

  button.highlight {
    color: var(--accent);
    fill: var(--accent);
    filter: saturate(0.9);
  }

  :global(html.desktop) button:hover,
  button:active,
  button.active {
    color: var(--text);
    fill: var(--text);
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.07);
    border-radius: 4px;
  }

  :global(html.desktop) button.highlight:hover,
  button.highlight:active {
    color: var(--accent);
    fill: var(--accent);
    filter: saturate(1.2);
  }

  :global(html.ios) button:focus-visible,
  :global(html.iosapp) button:focus-visible {
    outline: none;
  }

  /** Centers icon vertically */
  button > :global(svg) {
    display: block;
  }
</style>
