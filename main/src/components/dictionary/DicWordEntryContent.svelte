<script lang="ts">
  import {
    getOtherFormsInEntry,
    type EntryOtherForms,
    type PartOfSpeech,
    type Sense,
  } from "@/lib/dicEntry";
  import GroupedSenseView from "./GroupedSenseView.svelte";
  import DicEntryOtherForms from "./DicEntryOtherForms.svelte";
  import type { DicEntriesModel } from "./dicEntriesModel";
  import type { WordEntry } from "#platform/backend";

  export let entry: WordEntry;
  export let model: DicEntriesModel;

  let otherForms: EntryOtherForms | null;

  function onSelectSense(sense: Sense, poss: PartOfSpeech[]) {
    model.selectSense(entry, sense, poss);
  }

  $: otherForms = getOtherFormsInEntry(entry);
</script>

<div class="entry-content">
  <div class="groups">
    {#each entry.groupedSenses as group}
      <GroupedSenseView {group} {model} {onSelectSense} />
    {/each}
  </div>
  {#if otherForms !== null}
    <DicEntryOtherForms {otherForms} />
  {/if}
</div>
