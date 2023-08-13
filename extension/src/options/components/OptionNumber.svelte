<script lang="ts">
  import { type ConfigKeysOfType, Config } from "~/config";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";

  export let key: ConfigKeysOfType<number>;
  export let title: string;
  export let description: string = "";
  export let min: number | null = null;
  export let max: number | null = null;

  let value: number | undefined;

  async function load() {
    value = await Config.get(key);
  }

  function onBlur(ev: Event) {
    if (value === undefined) {
      return;
    }
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

  load();
</script>

<div>
  <OptionBase {title} {description}>
    <input
      type="number"
      bind:value
      {min}
      {max}
      on:blur={onBlur}
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
