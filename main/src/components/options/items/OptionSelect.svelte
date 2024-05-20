<script lang="ts" generics="T extends string">
  import Select from "components/Select.svelte";
  import OptionBase from "./OptionBase.svelte";

  export let options: (T | [T, string])[];
  export let selected: T;
  export let title: string;
</script>

<div>
  <OptionBase {title} {...$$restProps} wide>
    <Select bind:selected {options} />
    <slot slot="description" />
  </OptionBase>
</div>

<style>
  div :global(select) {
    width: 100%;
  }
</style>
