<script lang="ts">
  import { type ConfigKeysOfType, Config } from "~/config";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";

  export let changed: boolean;
  export let key: ConfigKeysOfType<string>;
  export let title: string;
  export let description: string = "";

  let value: string;

  async function load() {
    value = await Config.get(key);
  }

  function onValueChange(value: string) {
    Config.set(key, value);
    updateConfig();
  }

  load();
  $: onValueChange(value);
</script>

<div>
  <OptionBase {title} {description}>
    <input type="text" bind:value />
  </OptionBase>
</div>

<style>
  input {
    padding: 2px 4px;
  }
</style>
