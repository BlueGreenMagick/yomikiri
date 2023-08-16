<script lang="ts">
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";
  import ToggleSwitch from "~/components/ToggleSwitch.svelte";
  import Config, { type ConfigKeysOfType } from "~/config";

  export let key: ConfigKeysOfType<boolean>;
  export let title: string;
  export let description: string = "";

  let active = false;

  function update(value: boolean) {
    Config.set(key, value);
    updateConfig();
  }

  $: update(active);
</script>

<div>
  <OptionBase {title} {description}>
    <ToggleSwitch bind:active height={18} />
  </OptionBase>
</div>
