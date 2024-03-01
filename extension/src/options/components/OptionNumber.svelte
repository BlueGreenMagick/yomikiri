<script lang="ts">
  import { type ConfigKeysOfType, Config } from "~/config";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";

  export let key: ConfigKeysOfType<number>;
  export let title: string;
  export let description: string = "";
  export let min: number | null = null;
  export let max: number | null = null;
  export let disabled: boolean = false;

  let value: number = Config.get(key);

  function onChange(_: any) {
    if (min !== null && value < min) {
      value = min;
    }
    if (max !== null && value > max) {
      value = max;
    }
    Config.set(key, value);
    updateConfig();
  }

  function onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      (ev.currentTarget as HTMLInputElement).blur();
    }
  }
</script>

<div>
  <OptionBase {title} {description} {disabled}>
    <input
      type="number"
      bind:value
      {min}
      {max}
      {disabled}
      on:change={onChange}
      on:keydown={onKeydown}
    />
  </OptionBase>
</div>

<style>
  input {
    width: 120px;
    padding: 2px 4px;
  }
</style>
