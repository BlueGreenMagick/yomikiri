<script lang="ts">
  import type { ConfigKeysOfType, Config } from "~/config";
  import OptionBase from "./OptionBase.svelte";

  export let config: Config;
  export let key: ConfigKeysOfType<number>;
  export let title: string;
  export let min: number | null = null;
  export let max: number | null = null;
  export let disabled = false;

  let value: number = config.get(key);

  async function onChange(_: unknown) {
    if (min !== null && value < min) {
      value = min;
    }
    if (max !== null && value > max) {
      value = max;
    }
    await config.set(key, value);
  }

  function onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      (ev.currentTarget as HTMLInputElement).blur();
    }
  }
</script>

<div>
  <OptionBase {title} {disabled}>
    <input
      type="number"
      bind:value
      {min}
      {max}
      {disabled}
      on:change={onChange}
      on:keydown={onKeydown}
    />
    <slot slot="description" />
  </OptionBase>
</div>

<style>
  input {
    width: 120px;
    padding: 2px 4px;
  }
</style>
