<script lang="ts">
  import { type ConfigKeysOfType, Config } from "~/config";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";

  export let key: ConfigKeysOfType<string>;
  export let title: string;
  export let description: string = "";

  let value: string | undefined;

  async function load() {
    value = await Config.get(key);
  }

  function onBlur(ev: Event) {
    if (value === undefined) return;
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
    <input type="text" bind:value on:blur={onBlur} on:keydown={onKeydown} />
  </OptionBase>
</div>

<style>
  input {
    width: 120px;
    padding: 2px 4px;
  }
</style>
