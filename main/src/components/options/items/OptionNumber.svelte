<script lang="ts">
  import OptionBase from "./OptionBase.svelte";

  export let value: number;
  export let title: string;
  export let min: number | null = null;
  export let max: number | null = null;
  export let disabled = false;

  function onChange(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement;
    let val = element.valueAsNumber;
    // Putting in "", "-" evaluates to NaN
    if (isNaN(val)) {
      val = 0;
    }

    if (min !== null && val < min) {
      val = min;
    } else if (max !== null && val > max) {
      val = max;
    }
    // when input is changed from 0 to invalid value
    // ensure input is updated to 0
    if (val === 0 && value === val) {
      element.valueAsNumber = val;
    }
    value = val;
  }

  function onKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter" && !ev.shiftKey) {
      (ev.currentTarget as HTMLInputElement).blur();
    }
  }
</script>

<div>
  <OptionBase {title} {disabled}>
    <input
      type="number"
      {value}
      {min}
      {max}
      {disabled}
      on:change={onChange}
      on:keydown={onKeydown}
    />
    <slot slot="description" />
  </OptionBase>
</div>

<style>
  input {
    width: 120px;
    padding: 2px 4px;
  }
</style>
