<script lang="ts">
  import { type Sense, type GroupedSense, Dictionary } from "~/dictionary";
  import IconAddCircle from "@icons/add-circle.svg";

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
      <div class="meaning">
        <div class="anki-add">{@html IconAddCircle}</div>
        <div class="meaning-text">{text}</div>
      </div>
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
    padding: 0 8px;
  }

  .meaning {
    display: flex;
    gap: 2px;
    font-size: 14px;
    align-items: center;
    padding: 0 2px;
  }

  .meaning:hover {
    background-color: rgb(236, 236, 236);
  }

  .anki-add {
    width: 12px;
    height: 12px;
    fill: green;
    visibility: hidden;
  }

  .meaning:hover .anki-add {
    visibility: visible;
    opacity: 0.3;
  }

  .anki-add:hover {
    visibility: visible;
    opacity: 0.6 !important;
    cursor: pointer;
  }

  .meaning-text {
    flex: 1 1 auto;
  }
</style>
