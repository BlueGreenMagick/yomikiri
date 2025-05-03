<script lang="ts">
  import { type Entry, getMainForm, getMainReading } from "@/features/dicEntry";
  import IconAddCircleOutline from "#icons/add-circle-outline.svg";
  import { RubyString } from "@/features/japanese";
  import { Config } from "@/features/config";
  import Badges from "./Badges.svelte";
  import type { DicEntriesModel } from "./dicEntriesModel";
  import RubyText from "../../features/components/RubyText.svelte";
  import IconedButton from "@/features/components/IconedButton.svelte";
  import DicWordEntryContent from "./DicWordEntryContent.svelte";
  import DicNameEntryContent from "./DicNameEntryContent.svelte";
  import type { SelectedEntryForAnki } from "./types";

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
      <RubyText text={mainFormRuby} />
    </div>
    <div class="icons">
      {#if $ankiEnabledConfig && entry.type === "word"}
        <IconedButton
          size="2rem"
          highlight={$selectedMeaning?.entry === entry.entry}
          on:click={() => {
            onSelectEntryForAnki({
              entry: entry.entry,
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
    <DicWordEntryContent entry={entry.entry} {model} />
  {:else}
    <DicNameEntryContent entry={entry.entry} />
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
    margin: 0.5rem 1rem 0 0;
    font-size: 1.75rem;
    line-height: 1;
  }
  .icons {
    flex: 0 0 auto;

    display: flex;
  }
</style>
