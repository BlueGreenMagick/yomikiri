<script lang="ts">
  import type { ConfigKeysOfType, Config } from "~/config";
  import OptionBase from "./OptionBase.svelte";

  export let config: Config
  export let key: ConfigKeysOfType<string>;
  export let title: string;
  export let disabled = false;
  // Make Input box wider
  export let wide = false;

  let value: string = config.get(key);

  function onChange(_: Event) {
    if (value === undefined) return;
    config.set(key, value);
  }

  function onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      (ev.currentTarget as HTMLInputElement).blur();
    }
  }
</script>

<div>
  <OptionBase {title} {disabled} {wide}>
    <input
      type="text"
      bind:value
      {disabled}
      on:change={onChange}
      on:keydown={onKeydown}
    />
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
