<!--
  @component
  Convenience component for `<select>` element.

  `options` is an array of strings that serve as both value and label, or a tuple `[value, label]`
-->
<script lang="ts" generics="T extends string">
  export let options: (T | [T, string])[];
  export let selected: T;
</script>

<select bind:value={selected} on:change>
  {#each options as option}
    {#if typeof option === "string"}
      <option value={option}>{option}</option>
    {:else}
      <option value={option[0]}>{option[1]}</option>
    {/if}
  {/each}
</select>
