<script lang="ts">
  import ToggleSwitch from "@/features/components/ToggleSwitch.svelte";
  import OptionBase from "./OptionBase.svelte";

  export let value: boolean;
  export let title: string;
  export let onToggle: () => boolean = () => true;
</script>

<div>
  <OptionBase {title}>
    <ToggleSwitch bind:active={value} height={18} {onToggle} on:click />
    <slot slot="description" />
  </OptionBase>
</div>
