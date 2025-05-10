<script lang="ts">
  import { RubyString } from "@/features/japanese";

  export let text: RubyString;
</script>

{#key text}
  {#each text as unit (unit)}
    {#if unit.ruby === undefined}
      {unit.base}
    {:else}
      <ruby>{unit.base}<rt data-rt={unit.ruby} /></ruby>
    {/if}
  {/each}
{/key}
