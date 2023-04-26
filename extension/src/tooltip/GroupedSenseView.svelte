<script lang="ts">
  import { type Sense, type GroupedSense, Dictionary } from "../dictionary";

  export let group: GroupedSense;

  let posText: string;
  let meaningTexts: string[];

  function makePosText(poss: string[]): string {
    return poss.map((pos) => Dictionary.entityInfo(pos)).join(", ");
  }

  function makeMeaningTexts(senses: Sense[]): string[] {
    return senses
      .map((s) => s.meaning.join(", "))
      .map((meanings, idx) => `${idx + 1}. ${meanings}`);
  }

  $: posText = makePosText(group[0]);
  $: meaningTexts = makeMeaningTexts(group[1]);
</script>

<div class="grouped-sense">
  <div class="part-of-speech">
    {posText}
  </div>
  <div>
    {#each meaningTexts as text}
      <div class="meaning">{text}</div>
    {/each}
  </div>
</div>

<style>
  .grouped-sense {
    margin-top: 4px;
  }

  .part-of-speech {
    color: grey;
    font-size: 12px;
    margin-bottom: 2px;
  }

  .meaning {
    font-size: 14px;
  }
</style>
