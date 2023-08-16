<script lang="ts">
  export let active: boolean;
  export let height: number;
</script>

<div
  class="toggle-switch"
  class:active
  style:--height="{height}px"
  on:click={() => {
    active = !active;
  }}
>
  <div class="front" />
</div>

<style>
  .toggle-switch {
    --width: calc(var(--height) * 2);
    --circle-size: calc(var(--height) * 0.8);
    --gap: calc((var(--height) - var(--circle-size)) / 2);

    border-radius: calc(var(--height) / 2);
    width: var(--width);
    height: var(--height);
    transition: background-color 0.3s;
  }
  .toggle-switch {
    background-color: lightgray;
  }
  .toggle-switch.active {
    background-color: blue;
  }
  .front {
    position: relative;
    top: var(--gap);
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
