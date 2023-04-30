<script lang="ts">
  import OptionBase from "./OptionBase.svelte";
  import { type ConfigTypes, type ConfigKeysOfType, Config } from "~/config";

  export let key: ConfigKeysOfType<number>;
  export let title: string;
  export let description: string = "";

  let value: number;

  async function load() {
    value = await Config.get(key);
  }

  function onValueChange(value: number) {
    Config.set(key, value);
  }

  load();
  $: onValueChange(value);
</script>

<div>
  <OptionBase {title} {description}>
    <input type="number" bind:value />
  </OptionBase>
</div>

<style>
  input {
    padding: 2px 4px;
  }
</style>
