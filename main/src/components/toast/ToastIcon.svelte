<script lang="ts">
  import type { SvelteComponent } from "svelte";

  export let icon: typeof SvelteComponent;
  export let color: string = "#666666";
</script>

<div style:--color={color}>
  <svelte:component this={icon} />
</div>

<style>
  div {
    position: relative;
    margin-right: -4px;
    width: 20px;
    height: 20px;
  }
</style>
