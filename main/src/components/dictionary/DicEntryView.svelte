<script lang="ts" context="module">
  export interface SelectedEntryForAnki {
    entry: Entry;
    sense?: Sense | undefined;
  }
</script>

<script lang="ts">
  import { Entry, Sense, type GroupedSense } from "lib/dicEntry";
  import GroupedSenseView from "./GroupedSenseView.svelte";
  import IconAddCircleOutline from "@icons/add-circle-outline.svg";
  import { RubyString } from "lib/japanese";
  import type Config from "lib/config";
  import Badges from "./Badges.svelte";
  import type { DicEntriesModel } from "./dicEntriesModel";
  import RubyText from "../RubyText.svelte";
  import IconedButton from "components/IconedButton.svelte";

  export let config: Config;
  export let entry: Entry;
  export let model: DicEntriesModel;
  export let onSelectEntryForAnki: (
    selected: SelectedEntryForAnki,
  ) => void = () => null;

  const selectedSense = model.selectedSense;
  const ankiEnabledConfig = config.store("anki.enabled");

  let mainForm: string;
  let readingForForm: string;
  let mainFormRuby: RubyString;
  let groups: GroupedSense[];

  function selectEntryForAnki() {
    const sense = $selectedSense?.sense ?? undefined;
    onSelectEntryForAnki({ entry, sense });
  }

  function onSelectSense(sense: Sense) {
    model.selectSense(entry, sense);
  }

  $: mainForm = Entry.mainForm(entry);
  $: readingForForm = Entry.readingForForm(entry, mainForm, false).reading;
  $: mainFormRuby = RubyString.generate(mainForm, readingForForm);
  $: groups = Entry.groupSenses(entry);
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
          highlight={$selectedSense?.entry === entry}
          on:click={selectEntryForAnki}
        >
          <IconAddCircleOutline />
        </IconedButton>
      {/if}
    </div>
  </div>
  <Badges {entry} />
  <div class="groups">
    {#each groups as group}
      <GroupedSenseView {config} {group} {model} {onSelectSense} />
    {/each}
  </div>
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
    margin-bottom: 8px;
  }
</style>
