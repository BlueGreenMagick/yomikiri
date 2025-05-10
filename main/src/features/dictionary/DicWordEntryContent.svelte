<script lang="ts">
  import {
    type EntryOtherForms,
    getOtherFormsInEntry,
    type PartOfSpeech,
    type Sense,
  } from "@/features/dicEntry";
  import type { WordEntry } from "@yomikiri/backend-bindings";
  import type { AppCtx } from "../ctx";
  import type { DicEntriesModel } from "./dicEntriesModel";
  import DicEntryOtherForms from "./DicEntryOtherForms.svelte";
  import GroupedSenseView from "./GroupedSenseView.svelte";

  export let ctx: AppCtx;
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
    {#each entry.groupedSenses as group (group)}
      <GroupedSenseView {ctx} {group} {model} {onSelectSense} />
    {/each}
  </div>
  {#if otherForms !== null}
    <DicEntryOtherForms {otherForms} />
  {/if}
</div>
