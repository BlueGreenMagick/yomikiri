<script lang="ts">
  export let active: boolean;
  export let height: number;
</script>

<button
  class="toggle-switch"
  class:active
  style:--height="{height}px"
  type="button"
  aria-pressed={active ? "true" : "false"}
  on:click={() => {
    active = !active;
  }}
  on:click
>
  <div class="front" />
</button>

<style>
  .toggle-switch {
    display: flex;
    align-items: center;
    --width: calc(var(--height) * 2);
    --circle-size: calc(var(--height) * 0.8);
    --gap: calc((var(--height) - var(--circle-size)) / 2);

    border-radius: calc(var(--height) / 2);
    width: var(--width);
    height: var(--height);
    transition: background-color 0.3s;
    background-color: lightgray;
    outline-offset: 4px;
  }
  .toggle-switch.active {
    background-color: var(--selected-blue);
  }
  .front {
    position: relative;
    width: var(--circle-size);
    height: var(--circle-size);
    transform: translateX(var(--gap));
    transition: transform 0.3s;
    background-color: white;
    border-radius: 50%;
  }

  .toggle-switch.active .front {
    transform: translateX(calc(var(--width) - var(--gap) - var(--circle-size)));
  }
</style>
