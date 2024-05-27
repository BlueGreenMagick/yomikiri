<script lang="ts">
  import { RubyString } from "lib/japanese";

  export let text: RubyString;
</script>

{#each text as unit}
  {#if unit.ruby === undefined}
    {unit.base}
  {:else}
    <ruby>{unit.base}<rt>{unit.ruby}</rt></ruby>
  {/if}
{/each}
