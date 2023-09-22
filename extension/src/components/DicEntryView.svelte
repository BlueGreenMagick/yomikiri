<script lang="ts" context="module">
  export interface AddNoteForEntry {
    entry: Entry;
    sense?: Sense;
  }

  interface Events {
    addNote: AddNoteForEntry;
  }
</script>

<script lang="ts">
  import { Entry, Sense, type GroupedSense } from "~/dicEntry";
  import GroupedSenseView from "./GroupedSenseView.svelte";
  import IconAddCircleOutline from "@icons/add-circle-outline.svg";
  import { createEventDispatcher } from "svelte";
  import { RubyString } from "~/japanese";
  import Config from "~/config";
  import Badges from "./Badges.svelte";
  import type { DicEntriesModel } from "./dicEntriesModel";

  export let entry: Entry;
  export let model: DicEntriesModel;

  const dispatch = createEventDispatcher<Events>();

  let mainForm: string;
  let readingForForm: string;
  let mainFormRuby: string;
  let groups: GroupedSense[];

  const selectedSense = model.selectedSense;

  function addNote() {
    const sense = $selectedSense?.sense ?? undefined;
    dispatch("addNote", {
      entry,
      sense,
    });
  }

  function onSelectSense(ev: CustomEvent<Sense>) {
    const sense = ev.detail;
    console.log("selected sense");
    model.selectSense(entry, sense);
  }

  function onMouseDown(ev: MouseEvent) {
    model.unselectSense();
  }

  $: mainForm = Entry.mainForm(entry);
  $: readingForForm = Entry.readingForForm(entry, mainForm, false).reading;
  $: mainFormRuby = RubyString.toHtml(
    RubyString.generate(mainForm, readingForForm)
  );
  $: groups = Entry.groupSenses(entry);
</script>

<div class="entryView" on:mousedown={onMouseDown}>
  <div class="header">
    <div class="term">
      <span class="mainForm">{@html mainFormRuby}</span>
    </div>
    <div class="icons">
      {#if Config.get("anki.enabled")}
        <div
          class="icon"
          class:highlight={$selectedSense?.entry === entry}
          on:click={addNote}
          on:mousedown|preventDefault|stopPropagation={() => {}}
        >
          {@html IconAddCircleOutline}
        </div>
      {/if}
    </div>
  </div>
  <Badges {entry} />
  <div class="groups">
    {#each groups as group}
      <GroupedSenseView {group} {model} on:selectSense={onSelectSense} />
    {/each}
  </div>
</div>

<style>
  .entryView {
    overflow: hidden;
  }

  .header {
    margin: 4px 4px 0 4px;
    display: flex;
  }
  .term {
    flex: 1 1 auto;
    margin: 4px 12px 0px 4px;
  }
  .icons {
    flex: 0 0 auto;

    display: flex;
  }
  .icon {
    width: 24px;
    height: 24px;
    padding: 4px;
    color: var(--button-light);
    fill: var(--button-light);
  }
  .icon:hover {
    color: black;
    fill: black;
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.07);
    border-radius: 3px;
  }
  .icon.highlight {
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
