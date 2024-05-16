<script lang="ts" generics="T extends string">
  export let options: T[];
  export let selected: T;
</script>

<select bind:value={selected}>
  {#each options as option}
    <option value={option}>{option}</option>
  {/each}
</select>
