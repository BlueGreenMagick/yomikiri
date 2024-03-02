<script lang="ts">
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";
  import ToggleSwitch from "../../ToggleSwitch.svelte";
  import Config, { type ConfigKeysOfType } from "~/config";

  export let key: ConfigKeysOfType<boolean>;
  export let title: string;
  export let description: string = "";
  export let value: boolean = Config.get(key);

  function update() {
    Config.set(key, value);
    updateConfig();
  }
</script>

<div>
  <OptionBase {title} {description}>
    <ToggleSwitch bind:active={value} height={18} on:click={update} on:click />
  </OptionBase>
</div>
