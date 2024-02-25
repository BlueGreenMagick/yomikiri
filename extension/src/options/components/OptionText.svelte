<script lang="ts">
  import { type ConfigKeysOfType, Config } from "~/config";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";

  export let key: ConfigKeysOfType<string>;
  export let title: string;
  export let description: string = "";
  export let disabled: boolean = false;
  // Make Input box wider
  export let wide: boolean = false;

  let value: string = Config.get(key);

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
</script>

<div>
  <OptionBase {title} {description} {disabled} {wide}>
    <input
      type="text"
      bind:value
      {disabled}
      on:blur={onBlur}
      on:keydown={onKeydown}
    />
  </OptionBase>
</div>

<style>
  input {
    min-width: 120px;
    width: 100%;
    padding: 2px 4px;
  }
</style>
