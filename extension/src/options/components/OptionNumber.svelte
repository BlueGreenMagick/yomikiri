<script lang="ts">
  import { type Configuration, type ConfigKeysOfType, Config } from "~/config";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";

  export let key: ConfigKeysOfType<number>;
  export let title: string;
  export let description: string = "";

  let value: number;

  async function load() {
    value = await Config.get(key);
  }

  function onValueChange(value: number) {
    Config.set(key, value);
    updateConfig();
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
