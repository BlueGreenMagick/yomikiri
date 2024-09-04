<script lang="ts" context="module">
  export interface SelectedEntryForAnki {
    entry: Entry;
    selected?: SelectedMeaning | undefined;
  }
</script>

<script lang="ts">
  import {
    type Entry,
    type Sense,
    getMainForm,
    getReadingForForm,
    type EntryOtherForms,
    getOtherFormsInEntry,
    type PartOfSpeech,
  } from "lib/dicEntry";
  import GroupedSenseView from "./GroupedSenseView.svelte";
  import IconAddCircleOutline from "@icons/add-circle-outline.svg";
  import { RubyString } from "lib/japanese";
  import { Config } from "lib/config";
  import Badges from "./Badges.svelte";
  import type { DicEntriesModel, SelectedMeaning } from "./dicEntriesModel";
  import RubyText from "../RubyText.svelte";
  import IconedButton from "components/IconedButton.svelte";
  import DicEntryOtherForms from "./DicEntryOtherForms.svelte";

  export let entry: Entry;
  export let model: DicEntriesModel;
  export let onSelectEntryForAnki: (
    selected: SelectedEntryForAnki,
  ) => void = () => null;

  const config = Config.using();
  const selectedMeaning = model.selectedMeaning;
  const ankiEnabledConfig = config.store("anki.enabled");

  let mainForm: string;
  let readingForForm: string;
  let mainFormRuby: RubyString;
  let otherForms: EntryOtherForms | null;

  function selectEntryForAnki() {
    const selected = $selectedMeaning ?? undefined;
    onSelectEntryForAnki({ entry, selected });
  }

  function onSelectSense(sense: Sense, poss: PartOfSpeech[]) {
    model.selectSense(entry, sense, poss);
  }

  $: mainForm = getMainForm(entry);
  $: readingForForm = getReadingForForm(entry, mainForm, false).reading;
  $: mainFormRuby = RubyString.generate(mainForm, readingForForm);
  $: otherForms = getOtherFormsInEntry(entry);
</script>

<div class="entryView">
  <div class="header">
    <div class="term Japanese">
      <span class="mainForm"><RubyText text={mainFormRuby} /></span>
    </div>
    <div class="icons">
      {#if $ankiEnabledConfig}
        <IconedButton
          size="2em"
          highlight={$selectedMeaning?.entry === entry}
          on:click={selectEntryForAnki}
        >
          <IconAddCircleOutline />
        </IconedButton>
      {/if}
    </div>
  </div>
  <Badges {entry} />
  <div class="groups">
    {#each entry.groupedSenses as group}
      <GroupedSenseView {group} {model} {onSelectSense} />
    {/each}
  </div>
  {#if otherForms !== null}
    <DicEntryOtherForms {otherForms} />
  {/if}
</div>

<style>
  .entryView {
    overflow: hidden;
  }

  .header {
    margin: 4px var(--edge-horizontal-padding);
    margin-bottom: 0px;
    display: flex;
  }
  .term {
    flex: 1 1 auto;
    min-width: 0;
    margin: 4px 12px 0 0;
  }
  .icons {
    flex: 0 0 auto;

    display: flex;
  }

  .mainForm {
    font-size: 1.5rem;
  }

  .groups {
    margin-bottom: 12px;
  }
</style>
