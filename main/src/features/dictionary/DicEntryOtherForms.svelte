<script lang="ts">
  import type { EntryOtherForms } from "@/features/dicEntry";

  export let otherForms: EntryOtherForms;

  $: console.log(otherForms);
</script>

<div class="dic-entry-other-forms">
  <div class="section-header">Other Forms</div>
  <div class="other-forms-values Japanese">
    {#if otherForms.writings.length > 0}
      <div class="other-writings">
        {#each otherForms.writings as writingForm, i}
          <div class="other-writing {writingForm.rarity}">
            {writingForm.writing}<!--
       -->{#if writingForm.rarity !== "normal"}<span
                class="rarity-tag">({writingForm.rarity})</span
              >{/if}<!--
       -->{#if i < otherForms.writings.length - 1}、{/if}
          </div>
        {/each}
      </div>
    {/if}
    {#if otherForms.readings.length > 0}
      <div class="other-readings">
        {#each otherForms.readings as reading, i}
          <div class="other-reading {reading.rarity}">
            {reading.reading}<!--
         -->{#if reading.rarity !== "normal"}<span
                class="rarity-tag">({reading.rarity})</span
              >{/if}<!--
         -->{#if i < otherForms.readings.length - 1}、{/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .dic-entry-other-forms {
    padding: 0 var(--edge-horizontal-padding);
    margin-top: 0.5rem;
  }

  .section-header {
    font-size: 0.875rem;
    line-height: 1;
    color: var(--text-light);
  }

  .other-writings,
  .other-readings {
    display: flex;
    flex-wrap: wrap;
    margin-top: 0.5rem;
  }

  .other-readings {
    display: flex;
    flex-wrap: wrap;
  }

  .other-writing {
    min-width: 0;
    font-size: 1.2rem;
  }

  .other-reading {
    min-width: 0;
  }

  .rare,
  .outdated,
  .incorrect {
    color: var(--text-light);
  }

  .rarity-tag {
    font-size: 0.625em;
  }
</style>
