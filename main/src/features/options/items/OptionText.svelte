<script lang="ts">
  import OptionBase from "./OptionBase.svelte";

  export let value: string;
  export let title: string;
  export let disabled = false;
  // Make Input box wider
  export let wide = false;

  function onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      (ev.currentTarget as HTMLInputElement).blur();
    }
  }
</script>

<div>
  <OptionBase {title} {disabled} {wide}>
    <input type="text" bind:value {disabled} on:keydown={onKeydown} />
    <slot slot="description" />
  </OptionBase>
</div>

<style>
  input {
    min-width: 120px;
    width: 100%;
    padding: 2px 4px;
  }
</style>
