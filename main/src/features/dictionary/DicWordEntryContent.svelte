<script lang="ts">
  import {
    getOtherFormsInEntry,
    type EntryOtherForms,
    type PartOfSpeech,
    type Sense,
  } from "@/features/dicEntry";
  import GroupedSenseView from "./GroupedSenseView.svelte";
  import DicEntryOtherForms from "./DicEntryOtherForms.svelte";
  import type { DicEntriesModel } from "./dicEntriesModel";
  import type { WordEntry } from "#platform/backend";
  import type { AppContext } from "../context";

  export let ctx: AppContext;
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
      <GroupedSenseView {ctx} {group} {model} {onSelectSense} />
    {/each}
  </div>
  {#if otherForms !== null}
    <DicEntryOtherForms {otherForms} />
  {/if}
</div>
