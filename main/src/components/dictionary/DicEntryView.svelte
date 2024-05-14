<script lang="ts" context="module">
  export interface SelectedEntryForAnki {
    entry: Entry;
    sense?: Sense | undefined;
  }
</script>

<script lang="ts">
  import { Entry, Sense, type GroupedSense } from "~/lib/dicEntry";
  import GroupedSenseView from "./GroupedSenseView.svelte";
  import IconAddCircleOutline from "@icons/add-circle-outline.svg";
  import IconVolumeHigh from "@icons/volume-high.svg";
  import { RubyString } from "~/lib/japanese";
  import type Config from "~/lib/config";
  import Badges from "./Badges.svelte";
  import type { DicEntriesModel } from "./dicEntriesModel";
  import type { Platform } from "@platform";
  import RubyText from "../RubyText.svelte";

  export let platform: Platform;
  export let config: Config;
  export let entry: Entry;
  export let model: DicEntriesModel;
  export let onSelectEntryForAnki: (
    selected: SelectedEntryForAnki
  ) => void = () => null;

  let mainForm: string;
  let readingForForm: string;
  let mainFormRuby: RubyString;
  let groups: GroupedSense[];

  const selectedSense = model.selectedSense;

  function selectEntryForAnki() {
    const sense = $selectedSense?.sense ?? undefined;
    onSelectEntryForAnki({ entry, sense });
  }

  function onSelectSense(sense: Sense) {
    model.selectSense(entry, sense);
  }

  function playAudio() {
    const text = mainForm.length < 5 ? readingForForm : mainForm;
    platform.playTTS(text, config.get("tts.voice")).catch((err: unknown) => {
      throw err;
    });
  }

  $: mainForm = Entry.mainForm(entry);
  $: readingForForm = Entry.readingForForm(entry, mainForm, false).reading;
  $: mainFormRuby = RubyString.generate(mainForm, readingForForm);
  $: groups = Entry.groupSenses(entry);
</script>

<div class="entryView">
  <div class="header">
    <div class="term">
      <span class="mainForm"><RubyText text={mainFormRuby} /></span>
    </div>
    <div class="icons">
      {#if config.get("anki.enabled")}
        <button
          class="icon icon-anki-add"
          class:highlight={$selectedSense?.entry === entry}
          on:click={selectEntryForAnki}
          on:mousedown|preventDefault|stopPropagation={() => null}
        >
          <IconAddCircleOutline />
        </button>
      {/if}
      {#if config.get("tts.voice") !== null}
        <button
          class="icon"
          on:click={playAudio}
          on:mousedown|preventDefault|stopPropagation={() => null}
        >
          <IconVolumeHigh />
        </button>
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
  .icon {
    width: 2em;
    height: 2em;
    padding: 0.3em;
    color: var(--button-light);
    fill: var(--button-light);
    background-color: unset;
    border: unset;
    border-radius: unset;
  }
  :global(html.desktop) .icon:hover,
  .icon:active {
    color: black;
    fill: black;
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.07);
    border-radius: 3px;
  }

  :global(html.ios) .icon:focus-visible,
  :global(html.iosapp) .icon:focus-visible {
    outline: none;
  }

  .icon-anki-add.highlight {
    color: var(--accent);
    fill: var(--accent);
  }
  .mainForm {
    font-size: 1.5em;
    font-family: var(--japanese-font-family);
  }

  .groups {
    margin-bottom: 8px;
  }
</style>
