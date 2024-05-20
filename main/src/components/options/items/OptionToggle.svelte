<script lang="ts">
  import OptionBase from "./OptionBase.svelte";
  import ToggleSwitch from "../../ToggleSwitch.svelte";

  export let value: boolean;
  export let title: string;
</script>

<div>
  <OptionBase {title}>
    <ToggleSwitch
      bind:active={value}
      height={18}
      on:click={() => {
        value = !value;
      }}
      on:click
    />
    <slot slot="description" />
  </OptionBase>
</div>
