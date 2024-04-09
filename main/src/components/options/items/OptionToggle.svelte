<script lang="ts">
  import OptionBase from "./OptionBase.svelte";
  import ToggleSwitch from "../../ToggleSwitch.svelte";
  import type { Config, ConfigKeysOfType } from "~/config";

  export let config: Config
  export let key: ConfigKeysOfType<boolean>;
  export let title: string;
  export let value: boolean = config.get(key);

  function update() {
    config.set(key, value);
  }
</script>

<div>
  <OptionBase {title}>
    <ToggleSwitch bind:active={value} height={18} on:click={update} on:click />
    <slot slot="description" />
  </OptionBase>
</div>
