<script lang="ts">
  import { RubyString } from "lib/japanese";

  export let text: RubyString;
</script>

{#each text as unit}
  {#if unit.ruby === undefined}
    {unit.base}
  {:else}
    <ruby>{unit.base}<rt data-rt={unit.ruby} /></ruby>
  {/if}
{/each}
