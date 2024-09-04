<script lang="ts">
  import type { EntryOtherForms } from "lib/dicEntry";

  export let otherForms: EntryOtherForms;

  $: console.log(otherForms);
</script>

<div class="dic-entry-other-forms">
  <div class="section-header">Other Forms</div>
  <div class="other-forms-values Japanese">
    <div class="other-writings">
      {#each otherForms.writings as writingForm, i}
        <div class="other-writing {writingForm.rarity}">
          {writingForm.writing}<!--
       -->{#if writingForm.rarity !== "normal"}({writingForm.rarity}){/if}<!--
       -->{#if i < otherForms.writings.length - 1}、{/if}
        </div>
      {/each}
    </div>
    {#if otherForms.readings.length > 0}
      <div class="other-readings">
        {#each otherForms.readings as reading, i}
          <div class="other-reading {reading.rarity}">
            {reading.reading}<!--
         -->{#if reading.rarity !== "normal"}({reading.rarity}){/if}<!--
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
  }

  .section-header {
    font-size: 0.9rem;
    color: var(--text-light);
    margin-bottom: 0.25rem;
  }

  .other-writings {
    display: flex;
    flex-wrap: wrap;
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
</style>
