<script lang="ts" context="module">
  export interface SelectedEntryForAnki {
    entry: Entry.word;
    selected?: SelectedMeaning | undefined;
  }
</script>

<script lang="ts">
  import { type Entry, getMainForm, getMainReading } from "lib/dicEntry";
  import IconAddCircleOutline from "@icons/add-circle-outline.svg";
  import { RubyString } from "lib/japanese";
  import { Config } from "lib/config";
  import Badges from "./Badges.svelte";
  import type { DicEntriesModel, SelectedMeaning } from "./dicEntriesModel";
  import RubyText from "../RubyText.svelte";
  import IconedButton from "components/IconedButton.svelte";
  import DicWordEntryContent from "./DicWordEntryContent.svelte";
  import DicNameEntryContent from "./DicNameEntryContent.svelte";

  export let entry: Entry;
  export let model: DicEntriesModel;
  export let onSelectEntryForAnki: (
    selected: SelectedEntryForAnki,
  ) => void = () => null;

  const config = Config.using();
  const selectedMeaning = model.selectedMeaning;
  const ankiEnabledConfig = config.store("anki.enabled");

  function generateMainFormRuby(entry: Entry): RubyString {
    let mainForm = getMainForm(entry);
    let mainReading = "";
    if (entry.type === "word") {
      mainReading = getMainReading(entry, mainForm);
    }
    return RubyString.generate(mainForm, mainReading);
  }

  $: mainFormRuby = generateMainFormRuby(entry);
</script>

<div class="entryView">
  <div class="header">
    <div class="term Japanese">
      <span class="mainForm"><RubyText text={mainFormRuby} /></span>
    </div>
    <div class="icons">
      {#if $ankiEnabledConfig && entry.type === "word"}
        <IconedButton
          size="2em"
          highlight={$selectedMeaning?.entry === entry}
          on:click={() => {
            onSelectEntryForAnki({
              entry,
              selected: $selectedMeaning ?? undefined,
            });
          }}
        >
          <IconAddCircleOutline />
        </IconedButton>
      {/if}
    </div>
  </div>
  <Badges {entry} />
  {#if entry.type == "word"}
    <DicWordEntryContent {entry} {model} />
  {:else}
    <DicNameEntryContent {entry} />
  {/if}
</div>

<style>
  .entryView {
    overflow: hidden;
    padding-top: 0.25rem;
    padding-bottom: 0.75rem;
  }

  .header {
    margin: 0 var(--edge-horizontal-padding);
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
</style>
