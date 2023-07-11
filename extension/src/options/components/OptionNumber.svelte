<script lang="ts">
  import { type Configuration, type ConfigKeysOfType, Config } from "~/config";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";

  export let key: ConfigKeysOfType<number>;
  export let title: string;
  export let description: string = "";
  export let min: number | null = null;
  export let max: number | null = null;

  let value: number | undefined;
  let initial = true;

  async function load() {
    value = await Config.get(key);
  }

  function onValueChange(value: number | undefined) {
    if (value === undefined) return;
    if (initial === true) {
      initial = false;
      return;
    }
    Config.set(key, value);
    updateConfig();
  }

  load();
  $: onValueChange(value);
</script>

<div>
  <OptionBase {title} {description}>
    <input type="number" bind:value {min} {max} />
  </OptionBase>
</div>

<style>
  input {
    width: 120px;
    padding: 2px 4px;
  }
</style>
